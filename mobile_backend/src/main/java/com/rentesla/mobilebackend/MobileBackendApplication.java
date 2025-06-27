package com.rentesla.mobilebackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
@EnableTransactionManagement
@EnableConfigurationProperties
public class MobileBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(MobileBackendApplication.class, args);
        System.out.println("🚀 RenTesla Mobile Backend is running!");
        System.out.println("📱 API Documentation: http://localhost:8080/api/mobile/swagger-ui.html");
        System.out.println("🔍 Health Check: http://localhost:8080/api/mobile/actuator/health");
    }
} 