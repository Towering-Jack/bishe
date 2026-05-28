package cc.mrbird.febs.cos.controller;

import cc.mrbird.febs.common.properties.MinioProperties;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@Slf4j
@Controller
@RequestMapping("/file")
public class FileController {

    @Autowired
    private MinioClient minioClient;

    @Autowired
    private MinioProperties minioProperties;

    /**
     * 文件上传（上传到 MinIO）
     * @param file 上传的文件
     * @return 文件访问 URL
     */
    @ResponseBody
    @RequestMapping("/fileUpload")
    public String upload(@RequestParam("avatar") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return "上传失败：文件为空";
        }

        try {
            // 获取原始文件名和扩展名
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            // 生成新的文件名
            String newFileName = UUID.randomUUID() + fileExtension;

            // 上传到 MinIO
            InputStream inputStream = file.getInputStream();
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(newFileName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
            inputStream.close();

            // 返回 MinIO 访问 URL
            String fileUrl = minioProperties.getEndpoint() + "/" + minioProperties.getBucketName() + "/" + newFileName;
            log.info("文件上传成功: {}", fileUrl);
            return fileUrl;

        } catch (Exception e) {
            log.error("文件上传失败: {}", e.getMessage(), e);
            return "上传失败：" + e.getMessage();
        }
    }
}
