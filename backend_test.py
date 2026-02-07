#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class GridLockAPITester:
    def __init__(self, base_url="https://lockwise-6.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "/",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_user = {
            "email": f"test_user_{timestamp}@gridlock.test",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/auth/register",
            200,
            data=test_user
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.test_user = test_user
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        if not hasattr(self, 'test_user'):
            self.log_test("User Login", False, "No test user available")
            return False
            
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "/auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_user_profile(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "/auth/me",
            200
        )
        return success

    def test_lock_code_setup_pin4(self):
        """Test 4-digit PIN setup"""
        lock_data = {
            "lock_type": "pin4",
            "lock_code": "1234"
        }
        
        success, response = self.run_test(
            "Setup 4-Digit PIN",
            "POST",
            "/lock/setup",
            200,
            data=lock_data
        )
        
        if success:
            self.test_lock_code = "1234"
        return success

    def test_lock_code_verification(self):
        """Test lock code verification"""
        if not hasattr(self, 'test_lock_code'):
            self.log_test("Lock Code Verification", False, "No lock code set")
            return False
            
        verify_data = {
            "lock_code": self.test_lock_code
        }
        
        success, response = self.run_test(
            "Lock Code Verification",
            "POST",
            "/lock/verify",
            200,
            data=verify_data
        )
        return success

    def test_lock_code_setup_pin6(self):
        """Test 6-digit PIN setup"""
        lock_data = {
            "lock_type": "pin6",
            "lock_code": "123456"
        }
        
        success, response = self.run_test(
            "Setup 6-Digit PIN",
            "POST",
            "/lock/setup",
            200,
            data=lock_data
        )
        return success

    def test_lock_code_setup_password(self):
        """Test password setup"""
        lock_data = {
            "lock_type": "password",
            "lock_code": "MySecurePassword123!"
        }
        
        success, response = self.run_test(
            "Setup Password Lock",
            "POST",
            "/lock/setup",
            200,
            data=lock_data
        )
        return success

    def test_create_totp_account(self):
        """Test TOTP account creation"""
        totp_data = {
            "name": "test@example.com",
            "issuer": "TestService",
            "secret": "JBSWY3DPEHPK3PXP"  # Test secret
        }
        
        success, response = self.run_test(
            "Create TOTP Account",
            "POST",
            "/totp/accounts",
            200,
            data=totp_data
        )
        
        if success and 'id' in response:
            self.test_totp_id = response['id']
            return True
        return False

    def test_get_totp_accounts(self):
        """Test get all TOTP accounts"""
        success, response = self.run_test(
            "Get TOTP Accounts",
            "GET",
            "/totp/accounts",
            200
        )
        return success

    def test_get_single_totp_account(self):
        """Test get single TOTP account"""
        if not hasattr(self, 'test_totp_id'):
            self.log_test("Get Single TOTP Account", False, "No TOTP account created")
            return False
            
        success, response = self.run_test(
            "Get Single TOTP Account",
            "GET",
            f"/totp/accounts/{self.test_totp_id}",
            200
        )
        return success

    def test_update_totp_account(self):
        """Test update TOTP account"""
        if not hasattr(self, 'test_totp_id'):
            self.log_test("Update TOTP Account", False, "No TOTP account created")
            return False
            
        update_data = {
            "name": "updated@example.com",
            "issuer": "UpdatedService"
        }
        
        success, response = self.run_test(
            "Update TOTP Account",
            "PUT",
            f"/totp/accounts/{self.test_totp_id}",
            200,
            data=update_data
        )
        return success

    def test_totp_qr_generation(self):
        """Test TOTP QR code generation"""
        if not hasattr(self, 'test_totp_id'):
            self.log_test("TOTP QR Generation", False, "No TOTP account created")
            return False
            
        # This endpoint returns an image, so we check for 200 status
        url = f"{self.base_url}/totp/accounts/{self.test_totp_id}/qr"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            success = response.status_code == 200 and response.headers.get('content-type') == 'image/png'
            self.log_test("TOTP QR Generation", success, "" if success else f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("TOTP QR Generation", False, str(e))
            return False

    def test_totp_qr_parsing(self):
        """Test TOTP QR URI parsing"""
        test_uri = "otpauth://totp/TestService:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=TestService"
        
        success, response = self.run_test(
            "Parse TOTP QR URI",
            "POST",
            "/totp/parse-qr",
            200,
            data={"uri": test_uri}
        )
        return success

    def test_create_password_entry(self):
        """Test password vault entry creation"""
        password_data = {
            "name": "Test Account",
            "username": "testuser",
            "password": "testpassword123",
            "url": "https://example.com",
            "notes": "Test notes"
        }
        
        success, response = self.run_test(
            "Create Password Entry",
            "POST",
            "/vault/entries",
            200,
            data=password_data
        )
        
        if success and 'id' in response:
            self.test_password_id = response['id']
            return True
        return False

    def test_get_password_entries(self):
        """Test get all password entries"""
        success, response = self.run_test(
            "Get Password Entries",
            "GET",
            "/vault/entries",
            200
        )
        return success

    def test_get_single_password_entry(self):
        """Test get single password entry"""
        if not hasattr(self, 'test_password_id'):
            self.log_test("Get Single Password Entry", False, "No password entry created")
            return False
            
        success, response = self.run_test(
            "Get Single Password Entry",
            "GET",
            f"/vault/entries/{self.test_password_id}",
            200
        )
        return success

    def test_update_password_entry(self):
        """Test update password entry"""
        if not hasattr(self, 'test_password_id'):
            self.log_test("Update Password Entry", False, "No password entry created")
            return False
            
        update_data = {
            "name": "Updated Test Account",
            "notes": "Updated notes"
        }
        
        success, response = self.run_test(
            "Update Password Entry",
            "PUT",
            f"/vault/entries/{self.test_password_id}",
            200,
            data=update_data
        )
        return success

    def test_export_data(self):
        """Test data export functionality"""
        success, response = self.run_test(
            "Export All Data",
            "GET",
            "/export/all",
            200
        )
        
        if success:
            # Verify export structure
            expected_keys = ['totp_accounts', 'password_entries', 'exported_at']
            has_all_keys = all(key in response for key in expected_keys)
            if not has_all_keys:
                self.log_test("Export Data Structure", False, "Missing required keys in export")
                return False
            else:
                self.log_test("Export Data Structure", True)
        
        return success

    def test_delete_password_entry(self):
        """Test delete password entry"""
        if not hasattr(self, 'test_password_id'):
            self.log_test("Delete Password Entry", False, "No password entry created")
            return False
            
        success, response = self.run_test(
            "Delete Password Entry",
            "DELETE",
            f"/vault/entries/{self.test_password_id}",
            200
        )
        return success

    def test_delete_totp_account(self):
        """Test delete TOTP account"""
        if not hasattr(self, 'test_totp_id'):
            self.log_test("Delete TOTP Account", False, "No TOTP account created")
            return False
            
        success, response = self.run_test(
            "Delete TOTP Account",
            "DELETE",
            f"/totp/accounts/{self.test_totp_id}",
            200
        )
        return success

    def test_invalid_credentials(self):
        """Test invalid login credentials"""
        invalid_data = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        }
        
        success, response = self.run_test(
            "Invalid Login Credentials",
            "POST",
            "/auth/login",
            401,
            data=invalid_data
        )
        return success

    def test_unauthorized_access(self):
        """Test unauthorized access without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access",
            "GET",
            "/auth/me",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting GridLock API Tests...")
        print(f"📡 Testing endpoint: {self.base_url}")
        print("=" * 60)

        # Test sequence
        test_sequence = [
            self.test_root_endpoint,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_user_profile,
            self.test_lock_code_setup_pin4,
            self.test_lock_code_verification,
            self.test_lock_code_setup_pin6,
            self.test_lock_code_setup_password,
            self.test_create_totp_account,
            self.test_get_totp_accounts,
            self.test_get_single_totp_account,
            self.test_update_totp_account,
            self.test_totp_qr_generation,
            self.test_totp_qr_parsing,
            self.test_create_password_entry,
            self.test_get_password_entries,
            self.test_get_single_password_entry,
            self.test_update_password_entry,
            self.test_export_data,
            self.test_delete_password_entry,
            self.test_delete_totp_account,
            self.test_invalid_credentials,
            self.test_unauthorized_access,
        ]

        for test_func in test_sequence:
            try:
                test_func()
            except Exception as e:
                self.log_test(test_func.__name__, False, f"Test execution error: {str(e)}")
            
            # Small delay between tests
            time.sleep(0.1)

        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

    def get_test_results(self):
        """Get detailed test results"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_details": self.test_results
        }

def main():
    """Main test execution"""
    tester = GridLockAPITester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    results = tester.get_test_results()
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())