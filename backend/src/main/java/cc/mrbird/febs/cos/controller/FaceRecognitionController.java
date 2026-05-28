package cc.mrbird.febs.cos.controller;

import cc.mrbird.febs.common.properties.MinioProperties;
import cc.mrbird.febs.common.utils.R;
import cc.mrbird.febs.cos.entity.OwnerInfo;
import cc.mrbird.febs.cos.service.FaceRecognition;
import cc.mrbird.febs.cos.service.IOwnerInfoService;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Base64;
import java.util.UUID;

/**
 * 人脸识别
 */
@RestController
@RequestMapping("/cos/face")
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
@Slf4j
public class FaceRecognitionController {

    private final FaceRecognition faceRecognition;

    private final IOwnerInfoService ownerInfoService;

    private final MinioClient minioClient;

    private final MinioProperties minioProperties;

    /**
     * 上传文件到 MinIO
     * @param file 文件
     * @return 文件访问 URL
     */
    private String uploadToMinio(MultipartFile file) {
        try {
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFileName = UUID.randomUUID() + fileExtension;

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

            return minioProperties.getEndpoint() + "/" + minioProperties.getBucketName() + "/" + newFileName;
        } catch (Exception e) {
            log.error("上传到 MinIO 失败: {}", e.getMessage(), e);
            throw new RuntimeException("上传失败：" + e.getMessage());
        }
    }

    /**
     * 人脸注册
     *
     * @param file 图片
     * @param name 名称
     * @param ownerId 业主ID
     * @return 注册结果
     */
    @PostMapping("/registered")
    public R registered(@RequestParam("avatar") MultipartFile file,
                        @RequestParam("name") String name,
                        @RequestParam("ownerId") Integer ownerId) {
        try {
            String base64EncoderImg = Base64.getEncoder().encodeToString(file.getBytes());
            String result = faceRecognition.registered(base64EncoderImg, name);

            if ("success".equals(result)) {
                // 上传到 MinIO
                String fileUrl = uploadToMinio(file);
                // 只保存文件名部分，或者保存完整 URL
                String fileName = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);

                ownerInfoService.update(
                        Wrappers.<OwnerInfo>lambdaUpdate()
                                .set(OwnerInfo::getImages, fileName)
                                .eq(OwnerInfo::getId, ownerId)
                );
            }
            return R.ok(result);
        } catch (Exception e) {
            log.error("人脸注册失败: {}", e.getMessage(), e);
            return R.error("注册失败：" + e.getMessage());
        }
    }

    /**
     * 人脸搜索
     *
     * @param file 图片Base64
     * @param name 名称
     * @return 搜索结果
     */
    @PostMapping("/verification")
    public R verification(@RequestParam("file") String file, @RequestParam("name") String name) {
        String result = faceRecognition.verification(file);
        if ("error".equals(result)) {
            return R.ok("人脸识别未通过！");
        } else {
            if (name.equals(result)) {
                return R.ok("成功");
            } else {
                return R.ok("人脸不匹配！");
            }
        }
    }

    /**
     * 人脸检测
     *
     * @param img 图片Base64码
     * @return 检测结果
     */
    @RequestMapping("/faceDetection")
    public R faceDetection(String img) {
        return R.ok(faceRecognition.faceDetection(img));
    }
}
