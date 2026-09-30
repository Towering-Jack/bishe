package cc.mrbird.febs.common.exception;

/**
 * 缓存未命中。
 *
 * 说明：CacheService 里的 getXxx 用「抛异常」表示「Redis 里没有这条缓存」，
 * 这是正常的流程分支（随后会回退查数据库），不是故障。
 * 单独定义这个类型，是为了让 FebsUtil.selectCacheByTemplate 能区分
 * 「正常的缓存未命中」与「Redis 真的出错了」，从而不再把前者打成 ERROR 日志。
 */
public class CacheMissException extends Exception {

    private static final long serialVersionUID = 1L;

    public CacheMissException() {
        super("cache miss");
    }

    public CacheMissException(String message) {
        super(message);
    }
}
