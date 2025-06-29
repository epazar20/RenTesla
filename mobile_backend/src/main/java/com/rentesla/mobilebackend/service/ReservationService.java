package com.rentesla.mobilebackend.service;

import com.rentesla.mobilebackend.entity.Reservation;
import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.entity.Vehicle;
import com.rentesla.mobilebackend.repository.ReservationRepository;
import com.rentesla.mobilebackend.repository.UserRepository;
import com.rentesla.mobilebackend.repository.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ReservationService {

    private static final Logger logger = LoggerFactory.getLogger(ReservationService.class);

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PaymentService paymentService;

    /**
     * Create a new reservation
     */
    public Reservation createReservation(Long userId, String vehicleUuid, LocalDateTime startDate, 
                                       LocalDateTime endDate, String pickupLocation, String deliveryLocation) {
        logger.info("Creating reservation for user: {} vehicle: {} from {} to {}", 
                   userId, vehicleUuid, startDate, endDate);

        // Validate user
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if user is verified
        if (!documentService.isUserFullyVerified(userId)) {
            throw new RuntimeException("User must complete document verification before making reservations");
        }

        // Validate vehicle
        Vehicle vehicle = vehicleRepository.findByUuid(vehicleUuid)
            .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (!vehicle.getIsAvailable() || vehicle.getStatus() != Vehicle.VehicleStatus.AVAILABLE) {
            throw new RuntimeException("Vehicle is not available for reservation");
        }

        // Check vehicle availability for the requested dates
        if (!isVehicleAvailable(vehicleUuid, startDate, endDate)) {
            throw new RuntimeException("Vehicle is not available for the selected dates");
        }

        // Calculate pricing
        long numberOfDays = ChronoUnit.DAYS.between(startDate.toLocalDate(), endDate.toLocalDate());
        if (numberOfDays < 1) {
            numberOfDays = 1; // Minimum 1 day
        }

        BigDecimal dailyRate = vehicle.getPricePerDay() != null ? vehicle.getPricePerDay() : vehicle.getDailyRate();
        if (dailyRate == null) {
            throw new RuntimeException("Vehicle pricing not available");
        }

        BigDecimal totalPrice = dailyRate.multiply(BigDecimal.valueOf(numberOfDays));
        BigDecimal depositAmount = vehicle.getDepositAmount() != null ? vehicle.getDepositAmount() : 
                                  totalPrice.multiply(BigDecimal.valueOf(0.2)); // 20% deposit default

        // Create reservation
        Reservation reservation = new Reservation(userId, vehicleUuid, startDate, endDate);
        reservation.setTotalPrice(totalPrice);
        reservation.setDepositAmount(depositAmount);
        reservation.setDailyRate(dailyRate);
        reservation.setNumberOfDays((int) numberOfDays);
        reservation.setPickupLocation(pickupLocation);
        reservation.setDeliveryLocation(deliveryLocation);
        reservation.setStatus(Reservation.ReservationStatus.PENDING);
        reservation.setPaymentStatus(Reservation.PaymentStatus.PENDING);

        reservation = reservationRepository.save(reservation);

        // Send notification to user
        notificationService.sendReservationNotification(userId, "Your reservation has been created and is pending approval.");

        logger.info("Reservation created successfully: {}", reservation.getId());
        return reservation;
    }

    /**
     * Check if vehicle is available for the given dates
     */
    @Transactional(readOnly = true)
    public boolean isVehicleAvailable(String vehicleUuid, LocalDateTime startDate, LocalDateTime endDate) {
        return reservationRepository.isVehicleAvailable(vehicleUuid, startDate, endDate);
    }

    /**
     * Accept contract for reservation
     */
    public Reservation acceptContract(Long reservationId, Long userId, String contractVersion) {
        Reservation reservation = getReservationForUser(reservationId, userId);

        if (reservation.getStatus() != Reservation.ReservationStatus.PENDING) {
            throw new RuntimeException("Contract can only be accepted for pending reservations");
        }

        reservation.setContractAccepted(true);
        reservation.setContractAcceptedAt(LocalDateTime.now());
        reservation.setContractVersion(contractVersion);

        reservation = reservationRepository.save(reservation);

        // Send notification
        notificationService.sendReservationNotification(userId, "Contract accepted. Please proceed with payment.");

        return reservation;
    }

    /**
     * Process payment for reservation
     */
    public Reservation processPayment(Long reservationId, Long userId, String paymentToken) {
        Reservation reservation = getReservationForUser(reservationId, userId);

        if (!reservation.getContractAccepted()) {
            throw new RuntimeException("Contract must be accepted before payment");
        }

        if (reservation.getPaymentStatus() != Reservation.PaymentStatus.PENDING) {
            throw new RuntimeException("Payment already processed or failed");
        }

        try {
            // Process payment through PayTR
            String paymentId = paymentService.processPreAuthPayment(reservation, paymentToken);
            
            reservation.setPaymentId(paymentId);
            reservation.setPaymentStatus(Reservation.PaymentStatus.PRE_AUTH_SUCCESS);
            reservation.setStatus(Reservation.ReservationStatus.CONFIRMED);
            reservation.setConfirmedAt(LocalDateTime.now());

            reservation = reservationRepository.save(reservation);

            // Send confirmation notification
            notificationService.sendReservationNotification(userId, "Payment successful! Your reservation is confirmed.");

            return reservation;

        } catch (Exception e) {
            logger.error("Payment failed for reservation: {}", reservationId, e);
            
            reservation.setPaymentStatus(Reservation.PaymentStatus.PRE_AUTH_FAILED);
            reservationRepository.save(reservation);

            // Send failure notification
            notificationService.sendPaymentNotification(userId, "Payment failed. Please try again.");
            
            throw new RuntimeException("Payment processing failed: " + e.getMessage());
        }
    }

    /**
     * Start rental (when customer picks up the vehicle)
     */
    public Reservation startRental(Long reservationId, Long adminId) {
        Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() -> new RuntimeException("Reservation not found"));

        if (reservation.getStatus() != Reservation.ReservationStatus.CONFIRMED) {
            throw new RuntimeException("Only confirmed reservations can be started");
        }

        reservation.setStatus(Reservation.ReservationStatus.IN_PROGRESS);
        reservation.setStartedAt(LocalDateTime.now());

        reservation = reservationRepository.save(reservation);

        // Update vehicle status
        Vehicle vehicle = vehicleRepository.findByUuid(reservation.getVehicleUuid()).orElse(null);
        if (vehicle != null) {
            vehicle.setStatus(Vehicle.VehicleStatus.RENTED);
            vehicleRepository.save(vehicle);
        }

        // Send notification
        notificationService.sendReservationNotification(reservation.getUserId(), "Your rental has started. Enjoy your ride!");

        return reservation;
    }

    /**
     * Complete rental (when customer returns the vehicle)
     */
    public Reservation completeRental(Long reservationId, Long adminId) {
        Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() -> new RuntimeException("Reservation not found"));

        if (reservation.getStatus() != Reservation.ReservationStatus.IN_PROGRESS) {
            throw new RuntimeException("Only in-progress reservations can be completed");
        }

        reservation.setStatus(Reservation.ReservationStatus.COMPLETED);
        reservation.setCompletedAt(LocalDateTime.now());

        reservation = reservationRepository.save(reservation);

        // Update vehicle status
        Vehicle vehicle = vehicleRepository.findByUuid(reservation.getVehicleUuid()).orElse(null);
        if (vehicle != null) {
            vehicle.setStatus(Vehicle.VehicleStatus.AVAILABLE);
            vehicleRepository.save(vehicle);
        }

        // Capture payment
        try {
            paymentService.capturePayment(reservation.getPaymentId());
            reservation.setPaymentStatus(Reservation.PaymentStatus.COMPLETED);
            reservation.setPaymentCompletedAt(LocalDateTime.now());
            reservationRepository.save(reservation);
        } catch (Exception e) {
            logger.error("Payment capture failed for reservation: {}", reservationId, e);
        }

        // Send completion notification
        notificationService.sendReservationNotification(reservation.getUserId(), 
                                                       "Rental completed. Thank you for choosing us! Please leave a review.");

        return reservation;
    }

    /**
     * Cancel reservation
     */
    public Reservation cancelReservation(Long reservationId, Long userId, String reason) {
        Reservation reservation = getReservationForUser(reservationId, userId);

        if (reservation.getStatus() == Reservation.ReservationStatus.COMPLETED ||
            reservation.getStatus() == Reservation.ReservationStatus.CANCELLED) {
            throw new RuntimeException("Cannot cancel completed or already cancelled reservation");
        }

        reservation.setStatus(Reservation.ReservationStatus.CANCELLED);
        reservation.setCancelledAt(LocalDateTime.now());
        reservation.setCancellationReason(reason);

        reservation = reservationRepository.save(reservation);

        // Process refund if payment was made
        if (reservation.getPaymentStatus() == Reservation.PaymentStatus.PRE_AUTH_SUCCESS) {
            try {
                paymentService.refundPayment(reservation.getPaymentId());
                reservation.setPaymentStatus(Reservation.PaymentStatus.REFUNDED);
                reservationRepository.save(reservation);
            } catch (Exception e) {
                logger.error("Refund failed for reservation: {}", reservationId, e);
            }
        }

        // Send cancellation notification
        notificationService.sendReservationNotification(userId, "Your reservation has been cancelled.");

        return reservation;
    }

    /**
     * Get user reservations
     */
    @Transactional(readOnly = true)
    public List<Reservation> getUserReservations(Long userId) {
        return reservationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get reservation by ID for specific user
     */
    @Transactional(readOnly = true)
    public Reservation getReservationForUser(Long reservationId, Long userId) {
        Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() -> new RuntimeException("Reservation not found"));

        if (!reservation.getUserId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }

        return reservation;
    }

    /**
     * Get all reservations (admin)
     */
    @Transactional(readOnly = true)
    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    /**
     * Get pending reservations
     */
    @Transactional(readOnly = true)
    public List<Reservation> getPendingReservations() {
        return reservationRepository.findPendingReservations();
    }

    /**
     * Get reservations for a vehicle
     */
    @Transactional(readOnly = true)
    public List<Reservation> getVehicleReservations(String vehicleUuid) {
        return reservationRepository.findByVehicleUuid(vehicleUuid);
    }

    /**
     * Auto-start reservations that should begin
     */
    @Transactional
    public void autoStartReservations() {
        List<Reservation> reservationsToStart = reservationRepository.findReservationsToStart(LocalDateTime.now());
        
        for (Reservation reservation : reservationsToStart) {
            try {
                // Auto-start can be enabled based on business logic
                // For now, just log
                logger.info("Reservation {} is ready to start", reservation.getId());
            } catch (Exception e) {
                logger.error("Error auto-starting reservation: {}", reservation.getId(), e);
            }
        }
    }

    /**
     * Auto-complete reservations that should end
     */
    @Transactional
    public void autoCompleteReservations() {
        List<Reservation> reservationsToComplete = reservationRepository.findReservationsToComplete(LocalDateTime.now());
        
        for (Reservation reservation : reservationsToComplete) {
            try {
                // Auto-complete can be enabled based on business logic
                // For now, just log
                logger.info("Reservation {} should be completed", reservation.getId());
            } catch (Exception e) {
                logger.error("Error auto-completing reservation: {}", reservation.getId(), e);
            }
        }
    }
} 