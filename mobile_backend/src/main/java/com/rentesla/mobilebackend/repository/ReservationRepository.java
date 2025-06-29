package com.rentesla.mobilebackend.repository;

import com.rentesla.mobilebackend.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByUserId(Long userId);

    List<Reservation> findByVehicleUuid(String vehicleUuid);

    List<Reservation> findByStatus(Reservation.ReservationStatus status);

    List<Reservation> findByUserIdAndStatus(Long userId, Reservation.ReservationStatus status);

    List<Reservation> findByVehicleUuidAndStatus(String vehicleUuid, Reservation.ReservationStatus status);

    @Query("SELECT r FROM Reservation r WHERE r.userId = :userId ORDER BY r.createdAt DESC")
    List<Reservation> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query("SELECT r FROM Reservation r WHERE r.vehicleUuid = :vehicleUuid " +
           "AND r.status IN ('CONFIRMED', 'APPROVED', 'IN_PROGRESS') " +
           "AND ((r.startDate <= :endDate AND r.endDate >= :startDate))")
    List<Reservation> findConflictingReservations(@Param("vehicleUuid") String vehicleUuid,
                                                  @Param("startDate") LocalDateTime startDate,
                                                  @Param("endDate") LocalDateTime endDate);

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Reservation r " +
           "WHERE r.vehicleUuid = :vehicleUuid AND r.status IN ('CONFIRMED', 'APPROVED', 'IN_PROGRESS') " +
           "AND ((r.startDate <= :endDate AND r.endDate >= :startDate))")
    boolean isVehicleAvailable(@Param("vehicleUuid") String vehicleUuid,
                              @Param("startDate") LocalDateTime startDate,
                              @Param("endDate") LocalDateTime endDate);

    @Query("SELECT r FROM Reservation r WHERE r.status = 'PENDING' ORDER BY r.createdAt ASC")
    List<Reservation> findPendingReservations();

    @Query("SELECT r FROM Reservation r WHERE r.status = 'CONFIRMED' AND r.startDate <= :currentTime")
    List<Reservation> findReservationsToStart(@Param("currentTime") LocalDateTime currentTime);

    @Query("SELECT r FROM Reservation r WHERE r.status = 'IN_PROGRESS' AND r.endDate <= :currentTime")
    List<Reservation> findReservationsToComplete(@Param("currentTime") LocalDateTime currentTime);

    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.status = :status")
    long countByStatus(@Param("status") Reservation.ReservationStatus status);

    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.userId = :userId AND r.status = :status")
    long countByUserIdAndStatus(@Param("userId") Long userId, 
                               @Param("status") Reservation.ReservationStatus status);

    @Query("SELECT r FROM Reservation r WHERE r.paymentStatus = :paymentStatus")
    List<Reservation> findByPaymentStatus(@Param("paymentStatus") Reservation.PaymentStatus paymentStatus);

    @Query("SELECT r FROM Reservation r WHERE r.contractAccepted = false AND r.status = 'PENDING'")
    List<Reservation> findPendingContractAcceptance();

    // Statistics queries
    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.createdAt >= :fromDate AND r.createdAt <= :toDate")
    long countReservationsByDateRange(@Param("fromDate") LocalDateTime fromDate,
                                     @Param("toDate") LocalDateTime toDate);

    @Query("SELECT SUM(r.totalPrice) FROM Reservation r WHERE r.status = 'COMPLETED' " +
           "AND r.completedAt >= :fromDate AND r.completedAt <= :toDate")
    Optional<java.math.BigDecimal> getTotalRevenueByDateRange(@Param("fromDate") LocalDateTime fromDate,
                                                             @Param("toDate") LocalDateTime toDate);

    @Query("SELECT r.vehicleUuid, COUNT(r) as reservationCount FROM Reservation r " +
           "WHERE r.status = 'COMPLETED' GROUP BY r.vehicleUuid ORDER BY reservationCount DESC")
    List<Object[]> getMostPopularVehicles();

    // User activity
    @Query("SELECT r FROM Reservation r WHERE r.userId = :userId AND r.status = 'COMPLETED' " +
           "ORDER BY r.completedAt DESC")
    List<Reservation> findUserCompletedReservations(@Param("userId") Long userId);

    boolean existsByUserIdAndVehicleUuidAndStatus(
            Long userId, 
            String vehicleUuid, 
            Reservation.ReservationStatus status
    );
} 