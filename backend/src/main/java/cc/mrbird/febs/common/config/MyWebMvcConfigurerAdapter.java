package cc.mrbird.febs.common.config;

import cc.mrbird.febs.common.properties.MinioProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class MyWebMvcConfigurerAdapter implements WebMvcConfigurer {

    @Autowired
    private MinioProperties minioProperties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/images/**")
                .addResourceLocations(minioProperties.getEndpoint() + "/"
                        + minioProperties.getBucketName() + "/");
    }
}
