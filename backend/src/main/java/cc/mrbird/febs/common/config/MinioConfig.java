package cc.mrbird.febs.common.config;


import cc.mrbird.febs.common.properties.MinioProperties;
import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Minio配置类
 */
@Configuration
@Slf4j
public class MinioConfig {

    @Bean
    @ConditionalOnMissingBean
    public MinioClient minioClient(MinioProperties minioProperties) {
        log.info("开始创建Minio客户端对象");
        return MinioClient.builder()
                .endpoint(minioProperties.getEndpoint())
                .credentials(minioProperties.getAccessKey(),
                        minioProperties.getSecretKey())
                .build();
    }
}
