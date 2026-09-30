package cc.mrbird.febs.common.generator;

import com.baomidou.mybatisplus.generator.FastAutoGenerator;
import com.baomidou.mybatisplus.generator.config.OutputFile;
import com.baomidou.mybatisplus.generator.config.rules.DateType;
import com.baomidou.mybatisplus.generator.engine.FreemarkerTemplateEngine;
import org.apache.commons.lang3.StringUtils;

import java.util.Collections;
import java.util.Scanner;

/**
 * mybatis plus 3.5.x 提供的代码生成器
 * 可以快速生成 Entity、Mapper、Mapper XML、Service、Controller 等各个模块的代码
 *
 * mybatis-plus-generator 3.5.x 移除了旧的 AutoGenerator / InjectionConfig / GlobalConfig /
 * DataSourceConfig / PackageConfig / TemplateConfig / StrategyConfig 组合式 API（见
 * 3.5.1 起标记 @Deprecated 并在后续版本删除），改为 FastAutoGenerator 链式 API，
 * 因此此处按新 API 重写。生成逻辑与产物保持不变。
 *
 * @link https://baomidou.com/guides/new-code-generator/
 */
public class CodeGenerator {

    // 数据库 URL
    private static final String URL = "jdbc:mysql://127.0.0.1:3306/property_cos?useUnicode=true&characterEncoding=UTF-8&useJDBCCompliantTimezoneShift=true&useLegacyDatetimeCode=false&serverTimezone=UTC";
    // 数据库用户名
    private static final String USERNAME = "root";
    // 数据库密码
    private static final String PASSWORD = "123456";
    // @author 值
    private static final String AUTHOR = "FanK";
    // 包的基础路径
    private static final String BASE_PACKAGE_URL = "cc.mrbird.febs";
    // 模块名
    private static final String MODULE_NAME = "cos";
    // xml 文件输出目录（相对于项目根目录）
    private static final String XML_OUTPUT_DIR = "/src/main/resources/mapper/" + MODULE_NAME;
    // 自定义模板目录
    private static final String TEMPLATE_PATH = "/generator/templates/";

    public static void main(String[] args) {
        String projectPath = System.getProperty("user.dir");
        String tableName = scanner("表名");

        FastAutoGenerator.create(URL, USERNAME, PASSWORD)
                // 全局配置
                .globalConfig(builder -> builder
                        .author(AUTHOR)
                        .outputDir(projectPath + "/src/main/java")
                        .disableOpenDir()
                        .dateType(DateType.TIME_PACK)
                )
                // 包配置
                .packageConfig(builder -> builder
                        .parent(BASE_PACKAGE_URL)
                        .moduleName(MODULE_NAME)
                        .xml("mapper." + MODULE_NAME)
                        .pathInfo(Collections.singletonMap(
                                OutputFile.xml, projectPath + XML_OUTPUT_DIR))
                )
                // 模板配置：沿用项目原有的自定义模板
                .templateConfig(builder -> builder
                        .entity(TEMPLATE_PATH + "entity.java")
                        .mapper(TEMPLATE_PATH + "mapper.java")
                        .xml(TEMPLATE_PATH + "mapper.xml")
                        .service(TEMPLATE_PATH + "service.java")
                        .serviceImpl(TEMPLATE_PATH + "serviceImpl.java")
                        .controller(TEMPLATE_PATH + "controller.java")
                )
                // 策略配置
                .strategyConfig(builder -> builder
                        .addInclude(tableName)
                        .addTablePrefix(MODULE_NAME + "_")
                        .entityBuilder()
                        .enableLombok()
                        .addSuperEntityColumns("id")
                        .controllerBuilder()
                        .enableRestStyle()
                        .serviceBuilder()
                        .formatServiceFileName("%sService")
                        .formatServiceImplFileName("%sServiceImpl")
                )
                .templateEngine(new FreemarkerTemplateEngine())
                .execute();
    }

    private static String scanner(String tip) {
        @SuppressWarnings("resource")
        Scanner scanner = new Scanner(System.in);
        System.out.println(("请输入" + tip + "："));
        if (scanner.hasNext()) {
            String ipt = scanner.next();
            if (StringUtils.isNotBlank(ipt)) {
                return ipt;
            }
        }
        throw new IllegalArgumentException("请输入正确的" + tip + "！");
    }
}
