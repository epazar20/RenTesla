package com.rentesla.mobilebackend.controller;

import com.rentesla.mobilebackend.dto.AuthRequest;
import com.rentesla.mobilebackend.dto.AuthResponse;
import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.repository.UserRepository;
import com.rentesla.mobilebackend.service.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and return JWT token")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest authRequest) {
        
        // For demo purposes, we'll check against a simple admin user
        // In production, you should use proper password encoding/hashing
        if ("admin".equals(authRequest.getUsername()) && "admin123".equals(authRequest.getPassword())) {
            String token = jwtService.generateToken(authRequest.getUsername(), "ADMIN");
            
            AuthResponse authResponse = new AuthResponse(
                token, 
                authRequest.getUsername(), 
                "ADMIN",
                jwtExpiration / 1000 // convert to seconds
            );
            
            return ResponseEntity.ok(authResponse);
        }
        
        // Check database users
        Optional<User> userOptional = userRepository.findByEmail(authRequest.getUsername());
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            
            // For demo purposes, we'll use simple password check
            // In production, use BCrypt or similar
            if ("password123".equals(authRequest.getPassword()) && user.getIsActive()) {
                String token = jwtService.generateToken(user.getEmail(), user.getRole().toString());
                
                AuthResponse authResponse = new AuthResponse(
                    token, 
                    user.getEmail(), 
                    user.getRole().toString(),
                    jwtExpiration / 1000 // convert to seconds
                );
                
                return ResponseEntity.ok(authResponse);
            }
        }
        
        return ResponseEntity.status(401).body("Invalid credentials");
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
                
                return ResponseEntity.ok(new AuthResponse(token, username, role, null));
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