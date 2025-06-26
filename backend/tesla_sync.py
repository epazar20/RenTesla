#!/usr/bin/env python3
"""
Tesla Data Sync Service
Her 5 dakikada bir Tesla API'den vehicle ve location verilerini çekip database'e kaydeder.
"""

import time
import requests
import schedule
import threading
from datetime import datetime
from database import (
    init_db_pool, test_connection, get_tesla_token, save_vehicle_info,
    save_vehicle_location, start_sync_log, update_sync_log, get_all_vehicles
)
import teslapy
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_BASE_URL = f"http://localhost:{os.getenv('PORT', 5001)}"
TESLA_EMAIL = os.getenv('TESLA_EMAIL', 'your-email@example.com')
SYNC_INTERVAL_MINUTES = 5

class TeslaSyncService:
    def __init__(self):
        self.is_running = False
        self.last_sync = None
        
    def get_tesla_instance(self):
        """Get Tesla instance with token from database"""
        try:
            token = get_tesla_token(TESLA_EMAIL)
            if not token:
                print(f"❌ No valid token found for {TESLA_EMAIL}")
                return None
                
            tesla = teslapy.Tesla(TESLA_EMAIL, token=token)
            return tesla
        except Exception as e:
            print(f"❌ Tesla connection error: {e}")
            return None
    
    def sync_vehicles_data(self):
        """Sync vehicles and their locations"""
        if self.is_running:
            print("⏭️ Sync already running, skipping...")
            return
            
        self.is_running = True
        log_id = start_sync_log('vehicle_location_sync')
        
        vehicles_processed = 0
        locations_updated = 0
        errors_count = 0
        error_messages = []
        
        try:
            print(f"🔄 Starting Tesla sync at {datetime.now()}")
            
            # Get Tesla instance
            tesla = self.get_tesla_instance()
            if not tesla:
                error_msg = "Tesla connection failed - no valid token"
                print(f"❌ {error_msg}")
                update_sync_log(log_id, 'failed', error_msg, 0, 0, 1)
                return
            
            # Step 1: Fetch vehicles
            print("📋 Fetching vehicles list...")
            try:
                vehicles = tesla.vehicle_list()
                print(f"✅ Found {len(vehicles)} vehicles")
                
                for vehicle in vehicles:
                    try:
                        vehicles_processed += 1
                        
                        # Save vehicle info
                        vehicle_info = {
                            "id": vehicle.get("id"),
                            "vehicle_id": vehicle.get("vehicle_id"),
                            "vin": vehicle.get("vin"),
                            "display_name": vehicle.get("display_name"),
                            "state": vehicle.get("state"),
                            "option_codes": vehicle.get("option_codes"),
                            "color": vehicle.get("color"),
                            "in_service": vehicle.get("in_service"),
                            "api_version": vehicle.get("api_version")
                        }
                        
                        save_vehicle_info(vehicle_info, TESLA_EMAIL)
                        print(f"✅ Saved vehicle: {vehicle_info['display_name']} ({vehicle_info['vehicle_id']})")
                        
                        # Step 2: Fetch location for each vehicle
                        vehicle_id = vehicle.get("vehicle_id")
                        if vehicle_id:
                            try:
                                print(f"📍 Fetching location for vehicle {vehicle_id}...")
                                
                                # Get vehicle object - use the vehicle from the list directly
                                # since it's already a Tesla vehicle object
                                vehicle_obj = vehicle
                                
                                # Wake up vehicle if it's offline/asleep
                                if vehicle.get("state") in ["offline", "asleep"]:
                                    print(f"😴 Vehicle {vehicle_id} is {vehicle.get('state')}, attempting to wake...")
                                    try:
                                        vehicle_obj.sync_wake_up()
                                        time.sleep(10)  # Wait for vehicle to wake up
                                    except Exception as wake_error:
                                        print(f"⚠️ Could not wake vehicle {vehicle_id}: {wake_error}")
                                
                                # Get location data
                                vehicle_obj.get_vehicle_location_data()
                                drive_state = vehicle_obj.get("drive_state", {})
                                
                                if drive_state:
                                    location_data = {
                                        "latitude": drive_state.get("latitude"),
                                        "longitude": drive_state.get("longitude"),
                                        "heading": drive_state.get("heading"),
                                        "speed": drive_state.get("speed"),
                                        "gps_as_of": drive_state.get("gps_as_of"),
                                        "power": drive_state.get("power"),
                                        "shift_state": drive_state.get("shift_state")
                                    }
                                    
                                    # Save location to database
                                    if save_vehicle_location(vehicle_id, location_data):
                                        locations_updated += 1
                                        print(f"✅ Updated location for vehicle {vehicle_id}")
                                        print(f"   📍 Lat: {location_data.get('latitude')}, Lng: {location_data.get('longitude')}")
                                    else:
                                        errors_count += 1
                                        error_msg = f"Failed to save location for vehicle {vehicle_id}"
                                        error_messages.append(error_msg)
                                        print(f"❌ {error_msg}")
                                else:
                                    print(f"⚠️ No location data available for vehicle {vehicle_id}")
                                    
                            except Exception as location_error:
                                errors_count += 1
                                error_msg = f"Location fetch failed for vehicle {vehicle_id}: {str(location_error)}"
                                error_messages.append(error_msg)
                                print(f"❌ {error_msg}")
                                
                        # Small delay between vehicles to avoid rate limiting
                        time.sleep(2)
                        
                    except Exception as vehicle_error:
                        errors_count += 1
                        error_msg = f"Vehicle processing failed: {str(vehicle_error)}"
                        error_messages.append(error_msg)
                        print(f"❌ {error_msg}")
                        
            except Exception as api_error:
                errors_count += 1
                error_msg = f"Tesla API call failed: {str(api_error)}"
                error_messages.append(error_msg)
                print(f"❌ {error_msg}")
                
        except Exception as e:
            errors_count += 1
            error_msg = f"Sync operation failed: {str(e)}"
            error_messages.append(error_msg)
            print(f"❌ {error_msg}")
            
        finally:
            # Update sync log
            status = 'completed' if errors_count == 0 else 'completed_with_errors'
            message = f"Processed {vehicles_processed} vehicles, updated {locations_updated} locations"
            if error_messages:
                message += f". Errors: {'; '.join(error_messages[:3])}"  # First 3 errors
                
            update_sync_log(log_id, status, message, vehicles_processed, locations_updated, errors_count)
            
            self.last_sync = datetime.now()
            self.is_running = False
            
            print(f"✅ Sync completed at {self.last_sync}")
            print(f"📊 Summary: {vehicles_processed} vehicles, {locations_updated} locations, {errors_count} errors")
    
    def sync_via_api(self):
        """Alternative sync method using local API endpoints"""
        if self.is_running:
            print("⏭️ Sync already running, skipping...")
            return
            
        self.is_running = True
        log_id = start_sync_log('api_sync')
        
        vehicles_processed = 0
        locations_updated = 0
        errors_count = 0
        error_messages = []
        
        try:
            print(f"🔄 Starting API sync at {datetime.now()}")
            
            # Step 1: Fetch vehicles via API
            print("📋 Fetching vehicles via API...")
            try:
                response = requests.get(f"{API_BASE_URL}/api/tesla/vehicles", timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    vehicles = data.get('vehicles', [])
                    print(f"✅ Found {len(vehicles)} vehicles via API")
                    
                    for vehicle in vehicles:
                        try:
                            vehicles_processed += 1
                            vehicle_id = vehicle.get('vehicle_id')
                            
                            if vehicle_id:
                                # Step 2: Fetch location via API
                                print(f"📍 Fetching location for vehicle {vehicle_id} via API...")
                                location_response = requests.get(
                                    f"{API_BASE_URL}/api/tesla/vehicle/{vehicle_id}/location", 
                                    timeout=60
                                )
                                
                                if location_response.status_code == 200:
                                    location_data = location_response.json()
                                    if location_data.get('success'):
                                        locations_updated += 1
                                        print(f"✅ Updated location for vehicle {vehicle_id} via API")
                                    else:
                                        errors_count += 1
                                        error_msg = f"API location fetch failed for vehicle {vehicle_id}"
                                        error_messages.append(error_msg)
                                        print(f"❌ {error_msg}")
                                else:
                                    errors_count += 1
                                    error_msg = f"API location request failed for vehicle {vehicle_id}: {location_response.status_code}"
                                    error_messages.append(error_msg)
                                    print(f"❌ {error_msg}")
                                    
                            # Delay between requests
                            time.sleep(3)
                            
                        except Exception as vehicle_error:
                            errors_count += 1
                            error_msg = f"Vehicle API processing failed: {str(vehicle_error)}"
                            error_messages.append(error_msg)
                            print(f"❌ {error_msg}")
                            
                else:
                    errors_count += 1
                    error_msg = f"Vehicles API request failed: {response.status_code}"
                    error_messages.append(error_msg)
                    print(f"❌ {error_msg}")
                    
            except Exception as api_error:
                errors_count += 1
                error_msg = f"API sync failed: {str(api_error)}"
                error_messages.append(error_msg)
                print(f"❌ {error_msg}")
                
        except Exception as e:
            errors_count += 1
            error_msg = f"API sync operation failed: {str(e)}"
            error_messages.append(error_msg)
            print(f"❌ {error_msg}")
            
        finally:
            # Update sync log
            status = 'completed' if errors_count == 0 else 'completed_with_errors'
            message = f"API sync: {vehicles_processed} vehicles, {locations_updated} locations"
            if error_messages:
                message += f". Errors: {'; '.join(error_messages[:3])}"
                
            update_sync_log(log_id, status, message, vehicles_processed, locations_updated, errors_count)
            
            self.last_sync = datetime.now()
            self.is_running = False
            
            print(f"✅ API sync completed at {self.last_sync}")
            print(f"📊 Summary: {vehicles_processed} vehicles, {locations_updated} locations, {errors_count} errors")
    
    def start_scheduler(self, use_api=False):
        """Start the scheduled sync service"""
        print(f"🚀 Starting Tesla Sync Service...")
        print(f"📧 Tesla Email: {TESLA_EMAIL}")
        print(f"🔄 Sync Interval: {SYNC_INTERVAL_MINUTES} minutes")
        print(f"🌐 API Base URL: {API_BASE_URL}")
        print(f"📡 Sync Method: {'API' if use_api else 'Direct'}")
        
        # Initialize database
        if not init_db_pool():
            print("❌ Database initialization failed!")
            return
            
        if not test_connection():
            print("❌ Database connection test failed!")
            return
            
        # Schedule the sync job
        sync_method = self.sync_via_api if use_api else self.sync_vehicles_data
        schedule.every(SYNC_INTERVAL_MINUTES).minutes.do(sync_method)
        
        # Run initial sync
        print("🔄 Running initial sync...")
        sync_method()
        
        # Start scheduler loop
        print(f"⏰ Scheduler started. Next sync in {SYNC_INTERVAL_MINUTES} minutes...")
        while True:
            schedule.run_pending()
            time.sleep(30)  # Check every 30 seconds

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Tesla Data Sync Service')
    parser.add_argument('--api', action='store_true', help='Use API endpoints instead of direct Tesla calls')
    parser.add_argument('--once', action='store_true', help='Run sync once and exit')
    
    args = parser.parse_args()
    
    sync_service = TeslaSyncService()
    
    if args.once:
        # Run sync once and exit
        print("🔄 Running one-time sync...")
        if args.api:
            sync_service.sync_via_api()
        else:
            sync_service.sync_vehicles_data()
    else:
        # Start continuous scheduler
        sync_service.start_scheduler(use_api=args.api)

if __name__ == "__main__":
    main() 