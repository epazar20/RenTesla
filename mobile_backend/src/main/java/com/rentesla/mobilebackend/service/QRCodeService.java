package com.rentesla.mobilebackend.service;

import com.rentesla.mobilebackend.entity.Vehicle;
import com.rentesla.mobilebackend.repository.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class QRCodeService {

    private static final Logger logger = LoggerFactory.getLogger(QRCodeService.class);

    @Autowired
    private VehicleRepository vehicleRepository;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /**
     * Generate QR code for a vehicle
     */
    public String generateVehicleQRCode(String vehicleUuid) {
        logger.info("Generating QR code for vehicle: {}", vehicleUuid);

        Vehicle vehicle = vehicleRepository.findByUuid(vehicleUuid)
            .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        try {
            // Generate QR code content (deep link to vehicle detail page)
            String qrContent = generateQRContent(vehicleUuid);
            
            // TODO: Implement actual QR code image generation using ZXing or similar library
            // For now, we'll store the QR content as base64 placeholder
            String qrCodeImage = generateQRCodeImage(qrContent);
            
            // Update vehicle with QR code
            vehicle.setQrCodeImage(qrCodeImage);
            vehicleRepository.save(vehicle);
            
            logger.info("QR code generated successfully for vehicle: {}", vehicleUuid);
            return qrCodeImage;
            
        } catch (Exception e) {
            logger.error("Error generating QR code for vehicle: {}", vehicleUuid, e);
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }

    /**
     * Generate QR content for vehicle
     */
    private String generateQRContent(String vehicleUuid) {
        // Create deep link that opens the mobile app with vehicle details
        // Format: rentesla://vehicle/{uuid} or fallback to web URL
        return String.format("%s/vehicle/%s?source=qr", frontendUrl, vehicleUuid);
    }

    /**
     * Generate QR code image (mock implementation)
     */
    private String generateQRCodeImage(String content) {
        // TODO: Implement actual QR code generation using ZXing library
        // This is a mock implementation that returns a base64 placeholder
        
        logger.info("Generating QR code image for content: {}", content);
        
        // Mock base64 QR code image (in real implementation, use ZXing to generate actual QR code)
        String mockQRCode = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
        
        // In real implementation:
        // 1. Use com.google.zxing library
        // 2. Create QRCodeWriter
        // 3. Generate BitMatrix
        // 4. Convert to BufferedImage
        // 5. Convert to base64 string
        
        return mockQRCode;
    }

    /**
     * Regenerate QR codes for all vehicles
     */
    public void regenerateAllQRCodes() {
        logger.info("Regenerating QR codes for all vehicles");
        
        try {
            vehicleRepository.findAll().forEach(vehicle -> {
                try {
                    if (vehicle.getUuid() != null) {
                        generateVehicleQRCode(vehicle.getUuid());
                    }
                } catch (Exception e) {
                    logger.error("Error regenerating QR code for vehicle: {}", vehicle.getUuid(), e);
                }
            });
            
            logger.info("QR code regeneration completed");
            
        } catch (Exception e) {
            logger.error("Error during bulk QR code regeneration", e);
            throw new RuntimeException("Failed to regenerate QR codes", e);
        }
    }

    /**
     * Get vehicle by QR code scan
     */
    @Transactional(readOnly = true)
    public Optional<Vehicle> getVehicleByQRScan(String qrContent) {
        logger.info("Processing QR scan with content: {}", qrContent);
        
        try {
            // Extract vehicle UUID from QR content
            String vehicleUuid = extractVehicleUuidFromQRContent(qrContent);
            
            if (vehicleUuid != null) {
                return vehicleRepository.findByUuid(vehicleUuid);
            }
            
            return Optional.empty();
            
        } catch (Exception e) {
            logger.error("Error processing QR scan: {}", qrContent, e);
            return Optional.empty();
        }
    }

    /**
     * Extract vehicle UUID from QR content
     */
    private String extractVehicleUuidFromQRContent(String qrContent) {
        try {
            // Parse QR content to extract vehicle UUID
            // Expected format: {frontendUrl}/vehicle/{uuid}?source=qr
            
            if (qrContent.contains("/vehicle/")) {
                String[] parts = qrContent.split("/vehicle/");
                if (parts.length > 1) {
                    String uuidPart = parts[1];
                    // Remove query parameters if present
                    if (uuidPart.contains("?")) {
                        uuidPart = uuidPart.substring(0, uuidPart.indexOf("?"));
                    }
                    return uuidPart;
                }
            }
            
            return null;
            
        } catch (Exception e) {
            logger.error("Error extracting UUID from QR content: {}", qrContent, e);
            return null;
        }
    }

    /**
     * Validate QR code for vehicle
     */
    @Transactional(readOnly = true)
    public boolean validateVehicleQRCode(String vehicleUuid, String qrContent) {
        String expectedContent = generateQRContent(vehicleUuid);
        return expectedContent.equals(qrContent);
    }

    /**
     * Get QR code for vehicle
     */
    @Transactional(readOnly = true)
    public Optional<String> getVehicleQRCode(String vehicleUuid) {
        return vehicleRepository.findByUuid(vehicleUuid)
            .map(Vehicle::getQrCodeImage);
    }

    /**
     * Remove QR code from vehicle
     */
    public void removeVehicleQRCode(String vehicleUuid) {
        logger.info("Removing QR code for vehicle: {}", vehicleUuid);
        
        Vehicle vehicle = vehicleRepository.findByUuid(vehicleUuid)
            .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        vehicle.setQrCodeImage(null);
        vehicleRepository.save(vehicle);
        
        logger.info("QR code removed for vehicle: {}", vehicleUuid);
    }

    /**
     * Generate QR code with custom content
     */
    public String generateCustomQRCode(String content) {
        logger.info("Generating custom QR code for content: {}", content);
        
        try {
            return generateQRCodeImage(content);
        } catch (Exception e) {
            logger.error("Error generating custom QR code", e);
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }
} 