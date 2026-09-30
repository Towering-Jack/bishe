package cc.mrbird.febs.common.utils;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.lionsoul.ip2region.DataBlock;
import org.lionsoul.ip2region.DbConfig;
import org.lionsoul.ip2region.DbMakerConfigException;
import org.lionsoul.ip2region.DbSearcher;
import org.lionsoul.ip2region.Util;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

@Slf4j
public class AddressUtil {

    /** ip2region 数据库在 jar 内的位置 */
    private static final String DB_RESOURCE = "ip2region/ip2region.db";

    /**
     * 解压后的 searcher，只初始化一次。
     *
     * 原实现每次调用（即每次登录）都会重新解压 2.7MB 的数据库并重建索引；
     * 这里缓存复用。
     *
     * 线程安全说明：ip2region 1.7.2 的 DbSearcher#btreeSearch 每次调用都会在
     * 方法内部读取文件，实例本身只持有文件路径与配置，因此跨线程共享是安全的。
     */
    private static volatile DbSearcher SEARCHER;

    protected AddressUtil() {

    }

    public static String getCityInfo(String ip) {
        if (!Util.isIpAddress(ip)) {
            log.warn("非法 IP 地址，跳过归属地解析：{}", ip);
            return "";
        }
        try {
            DbSearcher searcher = getSearcher();
            if (searcher == null) {
                return "";
            }
            DataBlock dataBlock = searcher.btreeSearch(ip);
            return dataBlock == null ? "" : dataBlock.getRegion();
        } catch (Exception e) {
            // 归属地只是登录日志的一个附加字段，失败不应影响登录本身
            log.warn("获取地址信息失败（不影响登录）：ip={}, 原因={}", ip, e.toString());
        }
        return "";
    }

    /**
     * 取得（必要时初始化）searcher，修复原有的两处缺陷：
     *
     *  1. 临时文件路径：原写法 `tmpDir + "ip.db"` 在 Linux 上会拼成 "/tmpip.db"
     *     （缺少路径分隔符），导致 AccessDeniedException 并在每次登录时刷错误日志。
     *     改用 new File(tmpDir, name) 由 JDK 负责拼接。
     *
     *  2. 资源路径：原写法多写了一个 "classpath:" 前缀，
     *     getResourceAsStream("classpath:...") 必然返回 null，
     *     随后 Objects.requireNonNull 抛 NPE（被 catch 吞掉，表现为静默失败）。
     */
    private static DbSearcher getSearcher() throws IOException, DbMakerConfigException {
        DbSearcher local = SEARCHER;
        if (local != null) {
            return local;
        }
        synchronized (AddressUtil.class) {
            if (SEARCHER != null) {
                return SEARCHER;
            }
            File dbFile = resolveDbFile();
            if (dbFile == null) {
                return null;
            }
            SEARCHER = new DbSearcher(new DbConfig(), dbFile.getPath());
            return SEARCHER;
        }
    }

    /**
     * 定位 ip2region 数据库文件。
     *
     * 打成 jar 运行后 getResource(...).getPath() 得到的是
     * "file:/path/app.jar!/ip2region/ip2region.db" 这类形式，并不是真实存在的
     * 文件路径，所以必须把资源解压到临时目录再交给 DbSearcher。
     */
    private static File resolveDbFile() throws IOException {
        // 1) 直接位于文件系统（例如 IDE 中以 classes 目录运行）
        URL url = AddressUtil.class.getClassLoader().getResource(DB_RESOURCE);
        if (url != null && "file".equals(url.getProtocol())) {
            File direct = new File(url.getPath());
            if (direct.isFile()) {
                return direct;
            }
        }

        // 2) 位于 jar 内：解压到临时目录。先解压到 .tmp 再原子重命名，
        //    避免多个实例或并发启动时读到写了一半的文件。
        File target = new File(System.getProperty("java.io.tmpdir"), "ip2region.db");
        if (target.isFile() && target.length() > 0) {
            return target;
        }
        File tmp = new File(target.getParentFile(), "ip2region.db.tmp");
        try (InputStream in = AddressUtil.class.getClassLoader().getResourceAsStream(DB_RESOURCE)) {
            if (in == null) {
                log.warn("类路径下找不到 {}，归属地解析将被跳过", DB_RESOURCE);
                return null;
            }
            FileUtils.copyInputStreamToFile(in, tmp);
        }
        Files.move(tmp.toPath(), target.toPath(),
                StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        log.info("ip2region 数据库已释放到 {}（{} 字节）", target.getAbsolutePath(), target.length());
        return target;
    }
}
