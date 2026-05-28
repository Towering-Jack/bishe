package cc.mrbird.febs.job.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.quartz.SchedulerFactoryBean;

import javax.sql.DataSource;

/**
 * 定时任务配置
 *
 */
@Configuration
public class ScheduleConfig {

	@Bean
	public SchedulerFactoryBean schedulerFactoryBean(DataSource dataSource) {
		SchedulerFactoryBean factory = new SchedulerFactoryBean();
		factory.setDataSource(dataSource);
		factory.setSchedulerName("MyScheduler");
		// 延时启动
		factory.setStartupDelay(1);
		factory.setApplicationContextSchedulerContextKey("applicationContextKey");
		// 启动时更新已存在的 Job
		factory.setOverwriteExistingJobs(true);
		// 设置自动启动，默认为 true
		factory.setAutoStartup(true);

		return factory;
	}
}
