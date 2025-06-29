package com.rentesla.mobilebackend.controller;

import com.rentesla.mobilebackend.dto.AuthRequest;
import com.rentesla.mobilebackend.dto.AuthResponse;
import com.rentesla.mobilebackend.dto.ErrorResponse;
import com.rentesla.mobilebackend.dto.SignupRequest;
import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.entity.UserConsent;
import com.rentesla.mobilebackend.repository.UserRepository;
import com.rentesla.mobilebackend.repository.UserConsentRepository;
import com.rentesla.mobilebackend.service.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "JWT Authentication endpoints")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserConsentRepository userConsentRepository;

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    @Value("${demo.admin.username:admin}")
    private String demoAdminUsername;

    @Value("${demo.admin.password:change_this_password}")
    private String demoAdminPassword;

    @PostMapping("/signup")
    @Operation(summary = "User registration", description = "Register new user account")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest signupRequest) {
        
        System.out.println("🚀 Signup request received for email: " + signupRequest.getEmail());
        
        try {
            // Check if user already exists
            Optional<User> existingUser = userRepository.findByEmail(signupRequest.getEmail());
            if (existingUser.isPresent()) {
                System.out.println("❌ Email already exists: " + signupRequest.getEmail());
                return ResponseEntity.status(400).body(new ErrorResponse(
                    "EMAIL_EXISTS", 
                    "User with this email already exists",
                    "email"
                ));
            }
            
            // Validate required consents
            Map<String, Boolean> consents = signupRequest.getConsents();
            if (consents == null || !consents.getOrDefault("kvkk", false)) {
                System.out.println("❌ KVKK consent missing for: " + signupRequest.getEmail());
                return ResponseEntity.status(400).body(new ErrorResponse(
                    "KVKK_CONSENT_REQUIRED", 
                    "KVKK consent is required for registration",
                    "consents.kvkk"
                ));
            }
            if (!consents.getOrDefault("openConsent", false)) {
                System.out.println("❌ Open consent missing for: " + signupRequest.getEmail());
                return ResponseEntity.status(400).body(new ErrorResponse(
                    "OPEN_CONSENT_REQUIRED", 
                    "Open consent for data processing is required",
                    "consents.openConsent"
                ));
            }
            
            // Create new user
            User newUser = createNewUser(signupRequest);
            System.out.println("📝 Creating new user: " + newUser.getEmail());
            
            // Save user with transaction retry
            User savedUser = saveUserWithRetry(newUser, 3);
            System.out.println("✅ User saved with ID: " + savedUser.getId());
            
            // Save detailed consent records
            saveUserConsents(savedUser.getId(), consents);
            System.out.println("📋 Consents saved for user: " + savedUser.getId());
            
            // Generate JWT token for the new user
            String token = jwtService.generateToken(savedUser.getEmail(), savedUser.getRole().toString());
            
            AuthResponse authResponse = new AuthResponse(
                token, 
                savedUser.getId(),
                savedUser.getEmail(), 
                savedUser.getRole().toString(),
                jwtExpiration / 1000 // convert to seconds
            );
            
            System.out.println("🎉 Signup successful for: " + savedUser.getEmail());
            return ResponseEntity.ok(authResponse);
            
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Validation error during signup: " + e.getMessage());
            return ResponseEntity.status(400).body(new ErrorResponse(
                "VALIDATION_ERROR", 
                e.getMessage(),
                null
            ));
        } catch (Exception e) {
            System.err.println("❌ Signup error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(new ErrorResponse(
                "INTERNAL_ERROR", 
                "Registration failed due to server error. Please try again.",
                null
            ));
        }
    }

    private User createNewUser(SignupRequest signupRequest) {
        User newUser = new User();
        newUser.setEmail(signupRequest.getEmail());
        newUser.setFirstName(signupRequest.getFirstName());
        newUser.setLastName(signupRequest.getLastName());
        newUser.setPhone(signupRequest.getPhoneNumber());
        newUser.setRole(User.UserRole.CUSTOMER);
        newUser.setIsActive(true);
        newUser.setDocumentVerified(false);
        
        // Set consents based on signup data
        Map<String, Boolean> consents = signupRequest.getConsents();
        if (consents != null) {
            newUser.setKvkkConsentGiven(consents.getOrDefault("kvkk", false));
            newUser.setOpenConsentGiven(consents.getOrDefault("openConsent", false));
        } else {
            newUser.setKvkkConsentGiven(false);
            newUser.setOpenConsentGiven(false);
        }
        
        return newUser;
    }
    
    private User saveUserWithRetry(User user, int maxRetries) {
        int attempts = 0;
        while (attempts < maxRetries) {
            try {
                return userRepository.save(user);
            } catch (Exception e) {
                attempts++;
                if (attempts >= maxRetries) {
                    throw new RuntimeException("Failed to save user after " + maxRetries + " attempts", e);
                }
                
                // Wait before retry
                try {
                    Thread.sleep(100 * attempts); // Exponential backoff
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted during user save retry", ie);
                }
            }
        }
        throw new RuntimeException("Unexpected error in saveUserWithRetry");
    }

    private void saveUserConsents(Long userId, Map<String, Boolean> consents) {
        if (consents == null) {
            return;
        }
        
        try {
            LocalDateTime now = LocalDateTime.now();
            
            // Map frontend consent keys to backend consent types
            Map<String, UserConsent.ConsentType> consentMapping = Map.of(
                "kvkk", UserConsent.ConsentType.KVKK,
                "openConsent", UserConsent.ConsentType.OPEN_CONSENT,
                "location", UserConsent.ConsentType.LOCATION,
                "notification", UserConsent.ConsentType.NOTIFICATION,
                "marketing", UserConsent.ConsentType.MARKETING
            );
            
            for (Map.Entry<String, Boolean> entry : consents.entrySet()) {
                String consentKey = entry.getKey();
                Boolean consentValue = entry.getValue();
                
                UserConsent.ConsentType consentType = consentMapping.get(consentKey);
                if (consentType != null && consentValue != null && consentValue) {
                    UserConsent userConsent = new UserConsent();
                    userConsent.setUserId(userId);
                    userConsent.setConsentType(consentType);
                    userConsent.setStatus(UserConsent.ConsentStatus.GIVEN);
                    userConsent.setGivenAt(now);
                    userConsent.setConsentText("User consent given during registration via mobile app");
                    userConsent.setVersion("1.0");
                    
                    userConsentRepository.save(userConsent);
                }
            }
        } catch (Exception e) {
            System.err.println("Error saving user consents: " + e.getMessage());
            // Don't fail the signup if consent saving fails
        }
    }

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and return JWT token")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest authRequest) {
        
        try {
            // Demo admin login (remove in production)
            if (demoAdminUsername.equals(authRequest.getUsername()) && demoAdminPassword.equals(authRequest.getPassword())) {
                // Create demo admin JWT token
                String token = jwtService.generateToken(authRequest.getUsername(), "ADMIN");
                
                return ResponseEntity.ok(new AuthResponse(
                    token, 
                    1L, // Admin user ID
                    authRequest.getUsername(), 
                    "ADMIN",
                    jwtExpiration / 1000 // convert to seconds
                ));
            }
            
            // Check database users
            Optional<User> userOptional = userRepository.findByEmail(authRequest.getUsername());
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                
                // Check if user is active
                if (!user.getIsActive()) {
                    return ResponseEntity.status(401).body(new ErrorResponse(
                        "ACCOUNT_DISABLED", 
                        "Your account has been disabled. Please contact support.",
                        "username"
                    ));
                }
                
                // For demo purposes, we'll use simple password check
                // In production, use BCrypt or similar
                if ("password123".equals(authRequest.getPassword())) {
                    String token = jwtService.generateToken(user.getEmail(), user.getRole().toString());
                    
                    AuthResponse authResponse = new AuthResponse(
                        token, 
                        user.getId(),
                        user.getEmail(), 
                        user.getRole().toString(),
                        jwtExpiration / 1000 // convert to seconds
                    );
                    
                    return ResponseEntity.ok(authResponse);
                }
            }
            
            return ResponseEntity.status(401).body(new ErrorResponse(
                "INVALID_CREDENTIALS", 
                "Invalid username or password",
                "credentials"
            ));
            
        } catch (Exception e) {
            System.err.println("❌ Login error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(new ErrorResponse(
                "INTERNAL_ERROR", 
                "Login failed due to server error. Please try again.",
                null
            ));
        }
    }

    @PostMapping("/validate")
    @Operation(summary = "Validate JWT token", description = "Check if JWT token is valid")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("Invalid authorization header");
        }
        
        String token = authHeader.substring(7);
        
        try {
            if (jwtService.isTokenValid(token)) {
                String username = jwtService.extractUsername(token);
                String role = jwtService.extractRole(token);
                
                // For admin user, use userId = 1
                Long userId = "admin".equals(username) ? 1L : null;
                
                return ResponseEntity.ok(new AuthResponse(token, userId, username, role, null));
            } else {
                return ResponseEntity.status(401).body("Invalid or expired token");
            }
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Token validation failed");
        }
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user info", description = "Get current authenticated user information")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("Invalid authorization header");
        }
        
        String token = authHeader.substring(7);
        
        try {
            if (jwtService.isTokenValid(token)) {
                String username = jwtService.extractUsername(token);
                String role = jwtService.extractRole(token);
                
                // If it's admin user
                if ("admin".equals(username)) {
                    return ResponseEntity.ok().body("""
                        {
                            "username": "admin",
                            "role": "ADMIN",
                            "name": "System Administrator"
                        }
                        """);
                }
                
                // Find user in database
                Optional<User> userOptional = userRepository.findByEmail(username);
                if (userOptional.isPresent()) {
                    User user = userOptional.get();
                    return ResponseEntity.ok(user);
                }
                
                return ResponseEntity.status(404).body("User not found");
            } else {
                return ResponseEntity.status(401).body("Invalid or expired token");
            }
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Token validation failed");
        }
    }
} 