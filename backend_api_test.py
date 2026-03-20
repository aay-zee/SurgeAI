#!/usr/bin/env python3
"""
Backend API Testing Script
Tests all implemented endpoints and validates response structures
"""

import requests
import json
from datetime import datetime
from typing import Dict, Any, List
import sys

# Configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = 10

# Test credentials (create test user first or use existing)
TEST_EMAIL = f"test_{int(__import__('time').time())}@example.com"
TEST_PASSWORD = "TestPass123!"
TEST_CAMPAIGN_ID = 1

class APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        self.results = []

    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = f"[{timestamp}] [{level}]"
        try:
            print(f"{prefix} {message}")
        except UnicodeEncodeError:
            # Fallback for Windows console encoding issues
            print(f"{prefix} {message.encode('ascii', 'ignore').decode('ascii')}")

    def log_result(self, test_name: str, passed: bool, details: str = ""):
        status = "✅ PASS" if passed else "❌ FAIL"
        self.results.append({
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        self.log(f"{status} - {test_name}", "TEST")
        if details:
            self.log(f"   → {details}", "DETAIL")

    def register_user(self, email: str, password: str) -> bool:
        """Register a new test user"""
        self.log("Attempting user registration...", "SETUP")
        try:
            response = self.session.post(
                f"{self.base_url}/auth/register",
                json={
                    "email": email,
                    "password": password,
                    "full_name": "Test User"
                },
                timeout=TIMEOUT
            )

            if response.status_code == 201:
                data = response.json()
                self.token = data.get("access_token")
                self.log_result("User Registration", True, f"Token: {self.token[:20]}...")
                return True
            elif response.status_code == 409:
                self.log("User already exists, attempting login...", "INFO")
                return self.login_user(email, password)
            else:
                self.log_result("User Registration", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("User Registration", False, str(e))
            return False

    def login_user(self, email: str, password: str) -> bool:
        """Login user"""
        self.log("Attempting user login...", "SETUP")
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                data={
                    "username": email,
                    "password": password
                },
                timeout=TIMEOUT
            )

            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.log_result("User Login", True, f"Token: {self.token[:20]}...")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                return True
            else:
                self.log_result("User Login", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("User Login", False, str(e))
            return False

    def set_auth_header(self):
        """Set authorization header"""
        if self.token:
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})

    def test_endpoint(self, method: str, path: str, name: str, expected_fields: List[str] = None, timeout: int = None) -> Dict[str, Any]:
        """Test an API endpoint"""
        try:
            url = f"{self.base_url}{path}"
            self.log(f"Testing: {method} {path}", "REQUEST")

            # Use longer timeout for report endpoint
            request_timeout = timeout if timeout else (30 if "/report" in path else TIMEOUT)

            if method.upper() == "GET":
                response = self.session.get(url, timeout=request_timeout)
            elif method.upper() == "POST":
                response = self.session.post(url, json={}, timeout=request_timeout)
            else:
                response = self.session.request(method, url, timeout=request_timeout)

            self.log(f"Response Status: {response.status_code}", "RESPONSE")

            try:
                data = response.json()
            except:
                data = response.text

            # Check for errors
            if response.status_code in [401, 403]:
                self.log_result(name, False, f"Unauthorized (401/403)")
                return {"status_code": response.status_code, "data": data}

            if response.status_code in [404]:
                self.log_result(name, False, f"Not Found (404)")
                return {"status_code": response.status_code, "data": data}

            if response.status_code >= 400:
                self.log_result(name, False, f"HTTP {response.status_code}")
                return {"status_code": response.status_code, "data": data}

            # Validate structure if expected_fields provided
            passed = True
            missing_fields = []

            if expected_fields and isinstance(data, dict):
                for field in expected_fields:
                    if field not in data:
                        missing_fields.append(field)
                        passed = False

            details = ""
            if isinstance(data, dict):
                keys_list = list(data.keys())[:5]
                details = f"Keys: {', '.join(keys_list)}"
            elif isinstance(data, list):
                details = f"List with {len(data)} items"
            else:
                details = f"Type: {type(data).__name__}"

            self.log_result(name, passed, details)

            return {
                "status_code": response.status_code,
                "data": data,
                "missing_fields": missing_fields
            }

        except requests.exceptions.ConnectionError:
            self.log_result(name, False, "Connection refused (is backend running?)")
            return {"error": "Connection refused"}
        except Exception as e:
            self.log_result(name, False, str(e))
            return {"error": str(e)}

    def run_all_tests(self):
        """Run all API tests"""
        self.log("=" * 60, "HEADER")
        self.log("SURGEAI BACKEND API TEST SUITE", "HEADER")
        self.log("=" * 60, "HEADER")

        # Step 1: Authentication
        self.log("\nSTEP 1: AUTHENTICATION", "SECTION")
        self.register_user(TEST_EMAIL, TEST_PASSWORD)
        self.set_auth_header()

        # Step 1.5: Create a test campaign
        self.log("\nCreating test campaign...", "SETUP")
        try:
            campaign_resp = self.session.post(
                f"{self.base_url}/campaigns",
                json={
                    "campaign_name": "Backend Test Campaign",
                    "description": "Automated test campaign for API validation",
                    "keywords": ["test keyword 1", "test keyword 2", "test keyword 3"],
                    "platforms": ["reddit", "hacker_news", "quora"]
                },
                timeout=TIMEOUT
            )
            if campaign_resp.status_code == 201:
                campaign_id = campaign_resp.json().get("campaign_id")
                global TEST_CAMPAIGN_ID
                TEST_CAMPAIGN_ID = campaign_id
                self.log(f"Test campaign created with ID: {campaign_id}", "INFO")
            else:
                self.log(f"Failed to create campaign: Status {campaign_resp.status_code}", "ERROR")
        except Exception as e:
            self.log(f"Failed to create test campaign: {e}", "ERROR")

        # Step 2: Campaign Endpoints
        self.log("\nSTEP 2: CAMPAIGN ENDPOINTS", "SECTION")

        self.test_endpoint(
            "GET", "/campaigns",
            "Get All Campaigns",
            expected_fields=None  # Returns list
        )

        self.test_endpoint(
            "GET", f"/campaigns/{TEST_CAMPAIGN_ID}",
            "Get Campaign by ID",
            expected_fields=["campaign_id", "campaign_name", "status"]
        )

        # Step 3: Platform Data Endpoints
        self.log("\nSTEP 3: PLATFORM DATA ENDPOINTS", "SECTION")

        platforms = [
            ("reddit-data", "Reddit Data"),
            ("hackernews-data", "Hacker News Data"),
            ("product-hunt-data", "Product Hunt Data"),
            ("quora-data", "Quora Data"),
            ("google-play-data", "Google Play Data"),
            ("stack-exchange-data", "Stack Exchange Data"),
            ("search-volume-data", "Search Volume Data")
        ]

        for endpoint, name in platforms:
            self.test_endpoint(
                "GET", f"/campaigns/{TEST_CAMPAIGN_ID}/{endpoint}",
                f"Fetch {name}",
                expected_fields=None  # Returns list
            )

        # Step 4: Action Endpoints
        self.log("\n⚡ STEP 4: ACTION/CALCULATION ENDPOINTS", "SECTION")

        self.test_endpoint(
            "POST", f"/campaigns/{TEST_CAMPAIGN_ID}/calculate-validation",
            "Calculate Validation Scores",
            expected_fields=["status"]
        )

        # Extract Themes - only works if we have data, skip for now
        self.log("Extract Themes (skipping - requires scraped data)", "INFO")

        # Extract Competitor Themes - only works if we have data, skip for now
        self.log("Extract Competitor Themes (skipping - requires scraped data)", "INFO")

        self.test_endpoint(
            "POST", f"/campaigns/{TEST_CAMPAIGN_ID}/calculate-confidence",
            "Calculate Confidence Score",
            expected_fields=["status", "confidence_score"]
        )

        # Step 5: Get Endpoints
        self.log("\n📊 STEP 5: GET ENDPOINTS", "SECTION")

        self.test_endpoint(
            "GET", f"/campaigns/{TEST_CAMPAIGN_ID}/validation-score",
            "Get Validation Score",
            expected_fields=["score_id", "campaign_id"]
        )

        self.test_endpoint(
            "GET", f"/campaigns/{TEST_CAMPAIGN_ID}/google-trends",
            "Get Google Trends Data",
            expected_fields=None  # Returns list
        )

        self.test_endpoint(
            "GET", f"/campaigns/{TEST_CAMPAIGN_ID}/sentiment-summary",
            "Get Sentiment Summary",
            expected_fields=None  # Returns object
        )

        # Step 6: Primary Dashboard Endpoint
        self.log("\n🎯 STEP 6: PRIMARY DASHBOARD ENDPOINT", "SECTION")

        report_response = self.test_endpoint(
            "GET", f"/campaigns/{TEST_CAMPAIGN_ID}/report",
            "Get Comprehensive Report",
            expected_fields=["status", "campaign", "validation_scores", "confidence",
                           "themes", "competitor_analysis", "data_summary",
                           "market_signals", "raw_data"]
        )

        # Detailed validation of report structure
        if "data" in report_response and isinstance(report_response["data"], dict):
            self.log("\n📋 COMPREHENSIVE REPORT STRUCTURE VALIDATION", "DETAIL")
            self.validate_report_structure(report_response["data"])

        # Step 7: Keyword Endpoints
        self.log("\n🔑 STEP 7: KEYWORD ENDPOINTS", "SECTION")

        self.test_endpoint(
            "GET", f"/campaigns/{TEST_CAMPAIGN_ID}/keywords",
            "Get Campaign Keywords",
            expected_fields=None  # Returns list
        )

        self.test_endpoint(
            "GET", f"/campaigns/{TEST_CAMPAIGN_ID}/keywords/stats",
            "Get Keyword Stats",
            expected_fields=None  # Returns list
        )

        # Print Summary
        self.print_summary()

    def validate_report_structure(self, report: Dict[str, Any]):
        """Validate the comprehensive report structure"""
        required_sections = {
            "status": str,
            "campaign": dict,
            "validation_scores": dict,
            "confidence": dict,
            "themes": dict,
            "competitor_analysis": dict,
            "data_summary": dict,
            "market_signals": dict,
            "raw_data": dict
        }

        for section, expected_type in required_sections.items():
            if section in report:
                actual_type = type(report[section])
                if actual_type == expected_type or (expected_type == dict and isinstance(report[section], dict)):
                    self.log(f"  ✅ {section}: Present ({actual_type.__name__})", "DETAIL")
                else:
                    self.log(f"  ⚠️  {section}: Wrong type (expected {expected_type.__name__}, got {actual_type.__name__})", "WARN")
            else:
                self.log(f"  ❌ {section}: MISSING", "ERROR")

        # Validate campaign sub-fields
        if "campaign" in report:
            campaign = report["campaign"]
            campaign_fields = ["campaign_id", "campaign_name", "keywords", "platforms", "created_at"]
            for field in campaign_fields:
                if field in campaign:
                    self.log(f"    ✅ campaign.{field}: Present", "DETAIL")
                else:
                    self.log(f"    ❌ campaign.{field}: MISSING", "ERROR")

        # Validate confidence sub-fields
        if "confidence" in report:
            confidence = report["confidence"]
            confidence_fields = ["confidence_score", "confidence_percentage", "factors", "warnings"]
            for field in confidence_fields:
                if field in confidence:
                    self.log(f"    ✅ confidence.{field}: Present", "DETAIL")
                else:
                    self.log(f"    ❌ confidence.{field}: MISSING", "ERROR")

        # Check raw_data structure
        if "raw_data" in report:
            raw_data = report["raw_data"]
            platforms = ["reddit", "hacker_news", "product_hunt", "quora", "google_play", "stack_exchange"]
            for platform in platforms:
                if platform in raw_data:
                    count = len(raw_data[platform]) if isinstance(raw_data[platform], list) else "?"
                    self.log(f"    ✅ raw_data.{platform}: Present ({count} items)", "DETAIL")
                else:
                    self.log(f"    ❌ raw_data.{platform}: MISSING", "ERROR")

    def print_summary(self):
        """Print test results summary"""
        self.log("\n" + "=" * 60, "FOOTER")
        self.log("TEST SUMMARY", "FOOTER")
        self.log("=" * 60, "FOOTER")

        passed = sum(1 for r in self.results if r["passed"])
        failed = sum(1 for r in self.results if not r["passed"])
        total = len(self.results)

        self.log(f"Total Tests: {total}", "SUMMARY")
        self.log(f"Passed: {passed} ✅", "SUMMARY")
        self.log(f"Failed: {failed} ❌", "SUMMARY")
        self.log(f"Success Rate: {(passed/total*100):.1f}%", "SUMMARY")

        if failed > 0:
            self.log("\nFailed Tests:", "SUMMARY")
            for r in self.results:
                if not r["passed"]:
                    self.log(f"  ❌ {r['test']}: {r['details']}", "SUMMARY")

        self.log("=" * 60, "FOOTER")

        # Save results to file
        self.save_results()

    def save_results(self):
        """Save test results to JSON file"""
        filename = "backend_test_results.json"
        with open(filename, "w") as f:
            json.dump(self.results, f, indent=2)
        self.log(f"Results saved to {filename}", "INFO")


def main():
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = BASE_URL

    tester = APITester(base_url)
    tester.run_all_tests()


if __name__ == "__main__":
    main()
