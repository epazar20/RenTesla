package com.rentesla.mobilebackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;

public class SignupRequest {
    
    @NotBlank(message = "First name is required")
    @Size(max = 100)
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    @Size(max = 100)
    private String lastName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 255)
    private String email;
    
    @Size(max = 20)
    private String phoneNumber;
    
    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    private String password;
    
    // Consents for KVKK, notifications, etc.
    private Map<String, Boolean> consents;
    
    // Device permissions (camera, location, etc.)
    private Map<String, Boolean> permissions;
    
    // Constructors
    public SignupRequest() {}
    
    public SignupRequest(String firstName, String lastName, String email, String phoneNumber, 
                        String password, Map<String, Boolean> consents, Map<String, Boolean> permissions) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.password = password;
        this.consents = consents;
        this.permissions = permissions;
    }
    
    // Getters and Setters
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPhoneNumber() {
        return phoneNumber;
    }
    
    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
    
    public Map<String, Boolean> getConsents() {
        return consents;
    }
    
    public void setConsents(Map<String, Boolean> consents) {
        this.consents = consents;
    }
    
    public Map<String, Boolean> getPermissions() {
        return permissions;
    }
    
    public void setPermissions(Map<String, Boolean> permissions) {
        this.permissions = permissions;
    }
} 