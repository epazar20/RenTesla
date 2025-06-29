package com.rentesla.mobilebackend.repository;

import com.rentesla.mobilebackend.entity.UserConsent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserConsentRepository extends JpaRepository<UserConsent, Long> {

    List<UserConsent> findByUserId(Long userId);

    List<UserConsent> findByUserIdAndConsentType(Long userId, UserConsent.ConsentType consentType);

    Optional<UserConsent> findByUserIdAndConsentTypeAndStatus(
            Long userId, 
            UserConsent.ConsentType consentType, 
            UserConsent.ConsentStatus status
    );

    List<UserConsent> findByStatus(UserConsent.ConsentStatus status);

    List<UserConsent> findByConsentType(UserConsent.ConsentType consentType);

    @Query("SELECT uc FROM UserConsent uc WHERE uc.userId = :userId AND uc.consentType = :consentType " +
           "AND uc.status = 'GIVEN' AND uc.revokedAt IS NULL ORDER BY uc.givenAt DESC")
    Optional<UserConsent> findActiveConsent(@Param("userId") Long userId, 
                                           @Param("consentType") UserConsent.ConsentType consentType);

    @Query("SELECT uc FROM UserConsent uc WHERE uc.userId = :userId AND uc.status = 'GIVEN' " +
           "AND uc.revokedAt IS NULL")
    List<UserConsent> findActiveConsentsByUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(uc) FROM UserConsent uc WHERE uc.consentType = :consentType " +
           "AND uc.status = 'GIVEN' AND uc.givenAt >= :fromDate")
    long countConsentsByTypeAndDateRange(@Param("consentType") UserConsent.ConsentType consentType,
                                        @Param("fromDate") LocalDateTime fromDate);

    boolean existsByUserIdAndConsentTypeAndStatus(
            Long userId, 
            UserConsent.ConsentType consentType, 
            UserConsent.ConsentStatus status
    );

    @Query("SELECT CASE WHEN COUNT(uc) > 0 THEN true ELSE false END FROM UserConsent uc " +
           "WHERE uc.userId = :userId AND uc.consentType = :consentType AND uc.status = 'GIVEN' " +
           "AND uc.revokedAt IS NULL")
    boolean hasActiveConsent(@Param("userId") Long userId, 
                            @Param("consentType") UserConsent.ConsentType consentType);
} 