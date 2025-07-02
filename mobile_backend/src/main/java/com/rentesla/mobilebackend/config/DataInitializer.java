package com.rentesla.mobilebackend.config;

import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        logger.info("🔧 DataInitializer started - checking for required users...");
        
        try {
            // Clear existing users with temporary identity numbers (optional)
            userRepository.deleteByIdentityNumberStartingWith("TEMP_");
            logger.info("🗑️ Cleared temporary users");
            
            // Create Admin User if not exists
            if (!userRepository.findByEmail("admin@rentesla.com").isPresent()) {
                User admin = new User();
                admin.setEmail("admin@rentesla.com");
                admin.setFirstName("Admin");
                admin.setLastName("User");
                admin.setPhone("+90 555 000 0001");
                admin.setIdentityNumber("12345678901");
                admin.setPassword(passwordEncoder.encode("password123"));
                admin.setRole(User.UserRole.ADMIN);
                admin.setIsActive(true);
                admin.setDocumentVerified(true);
                admin.setKvkkConsentGiven(true);
                admin.setOpenConsentGiven(true);
                
                userRepository.save(admin);
                logger.info("✅ Admin user created: admin@rentesla.com");
            } else {
                logger.info("ℹ️ Admin user already exists");
            }
            
            // Create Test Customer User if not exists
            if (!userRepository.findByEmail("test@rentesla.com").isPresent()) {
                User testUser = new User();
                testUser.setEmail("test@rentesla.com");
                testUser.setFirstName("Test");
                testUser.setLastName("Customer");
                testUser.setPhone("+90 555 000 0002");
                testUser.setIdentityNumber("98765432109");
                testUser.setPassword(passwordEncoder.encode("password123"));
                testUser.setRole(User.UserRole.CUSTOMER);
                testUser.setIsActive(true);
                testUser.setDocumentVerified(false);
                testUser.setKvkkConsentGiven(true);
                testUser.setOpenConsentGiven(true);
                
                userRepository.save(testUser);
                logger.info("✅ Test customer user created: test@rentesla.com");
            } else {
                logger.info("ℹ️ Test customer user already exists");
            }
            
            logger.info("🎉 DataInitializer completed successfully");
            
        } catch (Exception e) {
            logger.error("❌ DataInitializer failed: {}", e.getMessage(), e);
        }
    }
} 