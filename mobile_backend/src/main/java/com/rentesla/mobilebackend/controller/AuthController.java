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
import com.rentesla.mobilebackend.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "JWT Authentication endpoints")
@CrossOrigin(origins = "*")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserConsentRepository userConsentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private NotificationService notificationService;

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    @Value("${demo.admin.username:admin}")
    private String demoAdminUsername;

    @Value("${demo.admin.password:change_this_password}")
    private String demoAdminPassword;

    @PostMapping("/signup")
    @Operation(summary = "User registration", description = "Register new user account")
    public ResponseEntity<Map<String, Object>> createNewUser(@Valid @RequestBody SignupRequest signupRequest) {
        try {
            // Hash the password
            String hashedPassword = passwordEncoder.encode(signupRequest.getPassword());
            
            User newUser = new User();
            newUser.setEmail(signupRequest.getEmail());
            newUser.setFirstName(signupRequest.getFirstName());
            newUser.setLastName(signupRequest.getLastName());
            newUser.setIdentityNumber(signupRequest.getIdentityNumber());
            newUser.setPassword(hashedPassword); // Save hashed password
            newUser.setRole(User.UserRole.CUSTOMER); // Default role for new users
            
            User savedUser = userRepository.save(newUser);
            logger.info("User created successfully: {}", savedUser.getEmail());
            
            // Create response without password
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User created successfully");
            response.put("userId", savedUser.getId());
            response.put("email", savedUser.getEmail());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (DataIntegrityViolationException e) {
            logger.warn("User creation failed - email already exists: {}", signupRequest.getEmail());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Email already exists");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
        } catch (Exception e) {
            logger.error("User creation failed: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "User creation failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and return JWT token")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest authRequest) {
        
        try {
            // Demo admin login (remove in production)
            if (demoAdminUsername.equals(authRequest.getUsername())) {
                // For demo admin, check plain text password temporarily 
                // TODO: Hash admin password and store in config or database
                if (demoAdminPassword.equals(authRequest.getPassword())) {
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
                
                // Check actual password from database using BCrypt
                if (user.getPassword() != null && passwordEncoder.matches(authRequest.getPassword(), user.getPassword())) {
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

    @PostMapping("/fcm/token")
    public ResponseEntity<Map<String, Object>> updateFCMToken(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {
        try {
            // Extract JWT token from Authorization header
            String token = authHeader.substring(7); // Remove "Bearer " prefix
            String email = jwtService.extractUsername(token);
            
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            String fcmToken = request.get("fcmToken");
            if (fcmToken == null || fcmToken.trim().isEmpty()) {
                throw new IllegalArgumentException("FCM token cannot be empty");
            }
            
            // Update FCM token via notification service
            notificationService.updateUserFCMToken(user.getId(), fcmToken);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "FCM token updated successfully");
            
            logger.info("FCM token updated for user: {}", user.getEmail());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Failed to update FCM token: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to update FCM token: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    @DeleteMapping("/fcm/token")
    public ResponseEntity<Map<String, Object>> removeFCMToken(
            @RequestHeader("Authorization") String authHeader) {
        try {
            // Extract JWT token from Authorization header
            String token = authHeader.substring(7); // Remove "Bearer " prefix
            String email = jwtService.extractUsername(token);
            
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Remove FCM token via notification service
            notificationService.removeUserFCMToken(user.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "FCM token removed successfully");
            
            logger.info("FCM token removed for user: {}", user.getEmail());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Failed to remove FCM token: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to remove FCM token: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh JWT token", description = "Get a new JWT token using an existing valid token")
    public ResponseEntity<?> refreshToken(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(new ErrorResponse(
                "INVALID_HEADER",
                "Invalid authorization header",
                "header"
            ));
        }

        String token = authHeader.substring(7);

        try {
            // Validate existing token
            if (!jwtService.isTokenValid(token)) {
                return ResponseEntity.status(401).body(new ErrorResponse(
                    "INVALID_TOKEN",
                    "Token is invalid or expired",
                    "token"
                ));
            }

            // Extract user info from existing token
            String username = jwtService.extractUsername(token);
            String role = jwtService.extractRole(token);

            // For admin user
            if ("admin".equals(username)) {
                String newToken = jwtService.generateToken(username, "ADMIN");
                return ResponseEntity.ok(new AuthResponse(
                    newToken,
                    1L,
                    username,
                    "ADMIN",
                    jwtExpiration / 1000
                ));
            }

            // For regular users
            Optional<User> userOptional = userRepository.findByEmail(username);
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                
                // Check if user is still active
                if (!user.getIsActive()) {
                    return ResponseEntity.status(401).body(new ErrorResponse(
                        "ACCOUNT_DISABLED",
                        "Your account has been disabled",
                        "account"
                    ));
                }

                // Generate new token
                String newToken = jwtService.generateToken(username, role);
                
                return ResponseEntity.ok(new AuthResponse(
                    newToken,
                    user.getId(),
                    username,
                    role,
                    jwtExpiration / 1000
                ));
            }

            return ResponseEntity.status(404).body(new ErrorResponse(
                "USER_NOT_FOUND",
                "User not found",
                "user"
            ));

        } catch (Exception e) {
            logger.error("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.status(500).body(new ErrorResponse(
                "REFRESH_FAILED",
                "Failed to refresh token: " + e.getMessage(),
                null
            ));
        }
    }
} 