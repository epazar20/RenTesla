package com.rentesla.mobilebackend.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.vision.v1.*;
import com.google.protobuf.ByteString;
import com.rentesla.mobilebackend.entity.Document;
import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.repository.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * OCR Service for document text extraction
 * Currently supports mock OCR processing for development
 * Google Cloud Vision API integration ready for production
 */
@Service
public class GoogleCloudVisionOCRService {
    
    private static final Logger logger = LoggerFactory.getLogger(GoogleCloudVisionOCRService.class);
    
    @Autowired
    private DocumentRepository documentRepository;

    @Value("${app.ocr.timeout.seconds:30}")
    private int ocrTimeoutSeconds;

    @Value("${app.ocr.mock.enabled:true}")
    private boolean mockEnabled;

    @Value("${google.cloud.vision.enabled:false}")
    private boolean visionApiEnabled;

    @Value("${google.cloud.project-id:your-project-id}")
    private String projectId;

    @Value("${google.cloud.credentials.location:classpath:vision/rentesla-464421-677259788a1d.json}")
    private String credentialsPath;
    
    /**
     * Main entry point for OCR processing
     * Handles both mock and real OCR based on configuration
     */
    public OCRResult processDocument(Document document, User user) throws Exception {
        logger.info("🔍 Starting OCR processing - Document: {}, Mock: {}, Vision API: {}", 
            document.getId(), mockEnabled, visionApiEnabled);
        
        if (mockEnabled) {
            logger.info("📋 Using mock OCR processing");
            return processMockOCR(document, user);
        } else if (visionApiEnabled) {
            logger.info("🤖 Using Google Cloud Vision OCR");
            return performGoogleCloudVisionOCR(document);
        } else {
            logger.warn("⚠️ Neither mock nor Vision API enabled - falling back to mock");
            return processMockOCR(document, user);
        }
    }

    /**
     * Mock OCR processing for development/testing
     */
    private OCRResult processMockOCR(Document document, User user) {
        logger.info("🎭 Processing mock OCR for document: {}", document.getId());
        
        // Simulate processing delay (2-5 seconds)
        try {
            Thread.sleep(2000 + (long)(Math.random() * 3000));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("OCR processing interrupted", e);
        }

        OCRResult result = new OCRResult();
        result.setIdentityNumber(user.getIdentityNumber());
        result.setFirstName(user.getFirstName());
        result.setLastName(user.getLastName());
        
        // Simulate different confidence levels based on document type
        double confidence = switch (document.getType()) {
            case DRIVING_LICENSE -> 0.89 + (Math.random() * 0.08); // 0.89-0.97
            case IDENTITY_CARD -> 0.85 + (Math.random() * 0.09);   // 0.85-0.94  
            case PASSPORT -> 0.91 + (Math.random() * 0.07);        // 0.91-0.98
        };
        
        result.setConfidence(confidence);
        result.setFullText("Mock OCR extracted text for " + user.getFirstName() + " " + user.getLastName());
        
        // Add some realistic document-specific data
        if (document.getType() == Document.DocumentType.DRIVING_LICENSE) {
            result.setLicenseNumber("B" + (100000 + (int)(Math.random() * 900000)));
            result.setExpiryDate("01/01/2030");
        } else if (document.getType() == Document.DocumentType.PASSPORT) {
            result.setPassportNumber("T" + (10000000 + (int)(Math.random() * 90000000)));
            result.setExpiryDate("01/01/2034");
        }
        result.setBirthDate("21/05/1988");
        
        logger.info("✨ Mock OCR completed - Confidence: {:.3f}", confidence);
        return result;
    }
    
    /**
     * OCR Result data structure
     */
    public static class OCRResult {
        private String identityNumber;
        private String firstName;
        private String lastName;
        private String birthDate;
        private String expiryDate;
        private String licenseNumber;
        private String passportNumber;
        private double confidence;
        private String fullText;
        
        // Getters and Setters
        public String getIdentityNumber() { return identityNumber; }
        public void setIdentityNumber(String identityNumber) { this.identityNumber = identityNumber; }
        
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        
        public String getBirthDate() { return birthDate; }
        public void setBirthDate(String birthDate) { this.birthDate = birthDate; }
        
        public String getExpiryDate() { return expiryDate; }
        public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }
        
        public String getLicenseNumber() { return licenseNumber; }
        public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }
        
        public String getPassportNumber() { return passportNumber; }
        public void setPassportNumber(String passportNumber) { this.passportNumber = passportNumber; }
        
        public double getConfidence() { return confidence; }
        public void setConfidence(double confidence) { this.confidence = confidence; }
        
        public String getFullText() { return fullText; }
        public void setFullText(String fullText) { this.fullText = fullText; }
    }
    
    /**
     * Custom exception for OCR timeouts
     */
    public static class OCRTimeoutException extends Exception {
        public OCRTimeoutException(String message) {
            super(message);
        }
    }
    
    /**
     * Custom exception for OCR processing errors
     */
    public static class OCRProcessingException extends Exception {
        public OCRProcessingException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    /**
     * Perform real Google Cloud Vision OCR processing
     */
    private OCRResult performGoogleCloudVisionOCR(Document document) throws Exception {
        logger.info("🤖 Starting Google Cloud Vision OCR for document {}", document.getId());
        
        ImageAnnotatorClient vision = null;
        try {
            // Load service account credentials
            logger.info("🔐 Loading service account credentials from: {}", credentialsPath);
            GoogleCredentials credentials = loadCredentials();
            
            // Create Vision client with credentials
            ImageAnnotatorSettings settings = ImageAnnotatorSettings.newBuilder()
                .setCredentialsProvider(() -> credentials)
                .build();
            vision = ImageAnnotatorClient.create(settings);
            
            logger.info("✅ Google Cloud Vision client created successfully");
            
            // Convert base64 to bytes
            String base64Data = document.getImageBase64();
            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1]; // Remove data:image/jpeg;base64, prefix
            }
            
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);
            ByteString imgBytes = ByteString.copyFrom(imageBytes);
            
            // Build the image annotation request
            Image img = Image.newBuilder().setContent(imgBytes).build();
            Feature feat = Feature.newBuilder().setType(Feature.Type.DOCUMENT_TEXT_DETECTION).build();
            AnnotateImageRequest request = AnnotateImageRequest.newBuilder()
                .addFeatures(feat)
                .setImage(img)
                .build();
            
            logger.info("📤 Sending OCR request to Google Cloud Vision API...");
            
            // Perform the request
            BatchAnnotateImagesResponse response = vision.batchAnnotateImages(List.of(request));
            List<AnnotateImageResponse> responses = response.getResponsesList();
            
            for (AnnotateImageResponse res : responses) {
                if (res.hasError()) {
                    logger.error("❌ Google Cloud Vision API error: {}", res.getError().getMessage());
                    throw new OCRProcessingException("Google Cloud Vision API error: " + res.getError().getMessage(), null);
                }
                
                // Extract text
                String fullText = res.getFullTextAnnotation().getText();
                logger.info("📝 Extracted text from document {}: {} characters", 
                    document.getId(), fullText.length());
                
                // Parse text based on document type
                return parseDocumentText(fullText, document.getType());
            }
            
            throw new OCRProcessingException("No text detected in document", null);
            
        } catch (IOException e) {
            logger.error("❌ Google Cloud Vision OCR failed for document {}: {}", 
                document.getId(), e.getMessage());
            throw new OCRProcessingException("OCR processing failed: " + e.getMessage(), e);
        } finally {
            if (vision != null) {
                try {
                    vision.close();
                    logger.info("🔐 Google Cloud Vision client closed");
                } catch (Exception e) {
                    logger.warn("Warning: Failed to close Vision client: {}", e.getMessage());
                }
            }
        }
    }

    /**
     * Load Google Cloud credentials from service account file
     */
    private GoogleCredentials loadCredentials() throws IOException {
        try {
            String path = credentialsPath;
            if (path.startsWith("classpath:")) {
                path = path.substring("classpath:".length());
                ClassPathResource resource = new ClassPathResource(path);
                
                if (!resource.exists()) {
                    throw new IOException("Service account key file not found: " + path);
                }
                
                try (InputStream credentialsStream = resource.getInputStream()) {
                    GoogleCredentials credentials = GoogleCredentials.fromStream(credentialsStream);
                    logger.info("✅ Successfully loaded service account credentials");
                    return credentials;
                }
            } else {
                // Handle file system path
                try (InputStream credentialsStream = new java.io.FileInputStream(path)) {
                    GoogleCredentials credentials = GoogleCredentials.fromStream(credentialsStream);
                    logger.info("✅ Successfully loaded service account credentials from file");
                    return credentials;
                }
            }
        } catch (Exception e) {
            logger.error("❌ Failed to load service account credentials: {}", e.getMessage());
            throw new IOException("Failed to load credentials: " + e.getMessage(), e);
        }
    }

    /**
     * Parse extracted text based on document type
     */
    private OCRResult parseDocumentText(String text, Document.DocumentType documentType) {
        logger.info("🔍 Parsing {} text: {} characters", documentType, text.length());
        
        // Log the full extracted text for debugging
        logger.info("📄 FULL EXTRACTED TEXT:");
        logger.info("=====================================");
        logger.info("{}", text);
        logger.info("=====================================");
        
        OCRResult result = new OCRResult();
        result.setFullText(text);
        result.setConfidence(calculateConfidence(text, documentType));
        
        switch (documentType) {
            case DRIVING_LICENSE:
                parseDrivingLicenseText(text, result);
                break;
            case IDENTITY_CARD:
                parseIdentityCardText(text, result);
                break;
            case PASSPORT:
                parsePassportText(text, result);
                break;
            default:
                logger.warn("⚠️ Unknown document type for parsing: {}", documentType);
        }
        
        logger.info("📊 Parsed OCR result - Confidence: {:.3f}, Identity: {}, Name: {} {}", 
            result.getConfidence(), result.getIdentityNumber(), result.getFirstName(), result.getLastName());
        
        return result;
    }

    /**
     * Parse driving license text
     */
    private void parseDrivingLicenseText(String text, OCRResult result) {
        logger.info("🚗 Parsing driving license text");
        
        // Turkish ID pattern (11 digits)
        Pattern idPattern = Pattern.compile("\\b(\\d{11})\\b");
        Matcher idMatcher = idPattern.matcher(text);
        
        // Log all ID matches found
        logger.info("🔍 Searching for Turkish ID patterns (11 digits)...");
        Matcher debugIdMatcher = idPattern.matcher(text);
        int idMatchCount = 0;
        while (debugIdMatcher.find()) {
            idMatchCount++;
            logger.info("   ID Match {}: '{}'", idMatchCount, debugIdMatcher.group(1));
        }
        
        if (idMatcher.find()) {
            String identityNumber = idMatcher.group(1);
            logger.info("✅ Selected Turkish ID: '{}'", identityNumber);
            result.setIdentityNumber(identityNumber);
        } else {
            logger.warn("⚠️ No Turkish ID patterns found in text");
        }
        
        // License number pattern (starts with letters)
        Pattern licensePattern = Pattern.compile("\\b([A-Z]{1,2}\\d{6,8})\\b");
        Matcher licenseMatcher = licensePattern.matcher(text);
        if (licenseMatcher.find()) {
            String licenseNumber = licenseMatcher.group(1);
            logger.info("✅ Found license number: '{}'", licenseNumber);
            result.setLicenseNumber(licenseNumber);
        } else {
            logger.warn("⚠️ No license number patterns found");
        }
        
        // Turkish driving license specific name extraction
        extractTurkishLicenseNames(text, result);
        
        // Date patterns
        extractDatesFromText(text, result);
    }

    /**
     * Extract names from Turkish driving license format
     * Turkish licenses use numbered format:
     * 1. SURNAME
     * 2. FirstName
     */
    private void extractTurkishLicenseNames(String text, OCRResult result) {
        logger.info("🇹🇷 Extracting names from Turkish driving license format...");
        
        // Pattern for Turkish driving license format
        // 1. SURNAME (may have dots, spaces)
        Pattern surnamePattern = Pattern.compile("1\\.?\\s*([A-ZÇĞIİÖŞÜ][A-ZÇĞIİÖŞÜa-zçğıiöşü\\s]+?)(?=\\s*\\n|\\s*2\\.|$)");
        
        // 2. FirstName (may have dots, spaces)  
        Pattern firstNamePattern = Pattern.compile("2\\.?\\s*([A-ZÇĞIİÖŞÜ][A-ZÇĞIİÖŞÜa-zçğıiöşü\\s]+?)(?=\\s*\\n|\\s*3\\.|$)");
        
        // Try to find surname (1. ...)
        Matcher surnameMatcher = surnamePattern.matcher(text);
        if (surnameMatcher.find()) {
            String surname = surnameMatcher.group(1).trim();
            logger.info("✅ Found Turkish license surname: '{}'", surname);
            result.setLastName(surname);
        } else {
            logger.warn("⚠️ No Turkish license surname pattern found (1. ...)");
        }
        
        // Try to find first name (2. ...)
        Matcher firstNameMatcher = firstNamePattern.matcher(text);
        if (firstNameMatcher.find()) {
            String firstName = firstNameMatcher.group(1).trim();
            logger.info("✅ Found Turkish license first name: '{}'", firstName);
            result.setFirstName(firstName);
        } else {
            logger.warn("⚠️ No Turkish license first name pattern found (2. ...)");
        }
        
        // If Turkish format fails, fallback to generic pattern
        if (result.getFirstName() == null || result.getLastName() == null) {
            logger.info("⚠️ Turkish format failed, trying generic name extraction...");
            extractNamesFromText(text, result);
        }
    }

    /**
     * Parse identity card text
     */
    private void parseIdentityCardText(String text, OCRResult result) {
        logger.info("🆔 Parsing identity card text");
        
        // Turkish ID pattern
        Pattern idPattern = Pattern.compile("\\b(\\d{11})\\b");
        Matcher idMatcher = idPattern.matcher(text);
        if (idMatcher.find()) {
            result.setIdentityNumber(idMatcher.group(1));
        }
        
        // Name extraction
        extractNamesFromText(text, result);
        
        // Birth date
        extractDatesFromText(text, result);
    }

    /**
     * Parse passport text
     */
    private void parsePassportText(String text, OCRResult result) {
        logger.info("🛂 Parsing passport text");
        
        // Passport number pattern
        Pattern passportPattern = Pattern.compile("\\b([A-Z]\\d{8})\\b");
        Matcher passportMatcher = passportPattern.matcher(text);
        if (passportMatcher.find()) {
            result.setPassportNumber(passportMatcher.group(1));
        }
        
        // Names in passport format
        extractNamesFromText(text, result);
        
        // Birth date and expiry date
        extractDatesFromText(text, result);
    }

    /**
     * Extract names from text with Turkish character support
     */
    private void extractNamesFromText(String text, OCRResult result) {
        logger.info("👤 Extracting names from text...");
        
        // Turkish name pattern
        Pattern namePattern = Pattern.compile("([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+)\\s+([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+)");
        Matcher nameMatcher = namePattern.matcher(text);
        
        // Log all matches found
        logger.info("🔍 Searching for name patterns...");
        Matcher debugMatcher = namePattern.matcher(text);
        int matchCount = 0;
        while (debugMatcher.find()) {
            matchCount++;
            logger.info("   Match {}: '{}' '{}'", matchCount, debugMatcher.group(1), debugMatcher.group(2));
        }
        
        if (nameMatcher.find()) {
            String firstName = nameMatcher.group(1);
            String lastName = nameMatcher.group(2);
            
            logger.info("✅ Selected name: '{}' '{}'", firstName, lastName);
            result.setFirstName(firstName);
            result.setLastName(lastName);
        } else {
            logger.warn("⚠️ No name patterns found in text");
        }
    }

    /**
     * Extract dates from text
     */
    private void extractDatesFromText(String text, OCRResult result) {
        logger.info("📅 Extracting dates from text...");
        
        Pattern datePattern = Pattern.compile("(\\d{2}[./]\\d{2}[./]\\d{4})");
        Matcher dateMatcher = datePattern.matcher(text);
        
        // Log all date matches found
        logger.info("🔍 Searching for date patterns (DD/MM/YYYY or DD.MM.YYYY)...");
        Matcher debugDateMatcher = datePattern.matcher(text);
        int dateMatchCount = 0;
        while (debugDateMatcher.find()) {
            dateMatchCount++;
            logger.info("   Date Match {}: '{}'", dateMatchCount, debugDateMatcher.group(1));
        }
        
        if (dateMatcher.find()) {
            String birthDate = dateMatcher.group(1);
            logger.info("✅ Selected birth date: '{}'", birthDate);
            result.setBirthDate(birthDate);
        } else {
            logger.warn("⚠️ No birth date patterns found");
        }
        
        // Look for additional dates (like expiry)
        if (dateMatcher.find()) {
            String expiryDate = dateMatcher.group(1);
            logger.info("✅ Found expiry date: '{}'", expiryDate);
            result.setExpiryDate(expiryDate);
        } else {
            logger.info("ℹ️ No expiry date found (this is normal for some documents)");
        }
    }

    /**
     * Calculate OCR confidence based on extracted data quality
     */
    private double calculateConfidence(String text, Document.DocumentType documentType) {
        double confidence = 0.6; // Base confidence for real OCR
        
        // Text length factor
        if (text.length() > 100) confidence += 0.15;
        if (text.length() > 200) confidence += 0.1;
        
        // Pattern matching factor
        if (text.matches(".*\\d{11}.*")) confidence += 0.1; // Has Turkish ID
        if (text.matches(".*[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+.*")) confidence += 0.05; // Has proper names
        if (text.matches(".*\\d{2}[./]\\d{2}[./]\\d{4}.*")) confidence += 0.05; // Has dates
        
        return Math.min(confidence, 0.98); // Cap at 98% for real OCR
    }
} 