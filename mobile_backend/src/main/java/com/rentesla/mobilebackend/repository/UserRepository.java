package com.rentesla.mobilebackend.repository;

import com.rentesla.mobilebackend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findByIdentityNumber(String identityNumber);

    List<User> findByRole(User.UserRole role);

    List<User> findByIsActive(Boolean isActive);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByIdentityNumber(String identityNumber);

    @Query("SELECT u FROM User u WHERE u.documentVerified = :verified")
    List<User> findByDocumentVerified(@Param("verified") Boolean verified);

    @Query("SELECT u FROM User u WHERE u.kvkkConsentGiven = :consent AND u.openConsentGiven = :consent")
    List<User> findByConsentStatus(@Param("consent") Boolean consent);

    @Modifying
    @Transactional
    @Query("DELETE FROM User u WHERE u.identityNumber LIKE CONCAT(:prefix, '%')")
    void deleteByIdentityNumberStartingWith(@Param("prefix") String prefix);

    List<User> findByIsActiveTrue();

    @Query("SELECT u FROM User u WHERE u.isActive = true AND " +
           "(LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<User> searchActiveUsers(@Param("search") String search);

    long countByIsActiveTrue();

    long countByRole(User.UserRole role);
} 