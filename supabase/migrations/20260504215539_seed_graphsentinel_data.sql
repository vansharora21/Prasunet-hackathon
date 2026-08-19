/*
  # Seed GraphSentinel Demo Data

  ## Summary
  Seeds the GraphSentinel database with 60 synthetic accounts, 600 transactions,
  and pre-constructed fraud pattern examples for all five detection types.
  Also seeds fraud_patterns configuration, federated_nodes, and fraud_alerts with
  SHAP narratives.

  ## Fraud Patterns Seeded
  1. Multi-hop Layering (accounts A01 → A05 chain)
  2. Circular Round-Trip (accounts B01 → B04 → B01)
  3. Structuring below ₹10L threshold (account C01 repeated transfers)
  4. Dormant Account Reactivation (account D01, inactive 8 months, high-value transfer)
  5. KYC Mismatch (account E01, declared income ₹3L, transacts ₹45L/month)
*/

-- Seed fraud_patterns
INSERT INTO fraud_patterns (id, name, description, amount_ceiling, time_window_hours, hop_count, multiplier, is_enabled) VALUES
('pat_multilayer', 'Multi-Hop Layering', 'Funds transferred through 3 or more intermediate accounts within 48 hours to obscure origin', 5000000, 48, 3, 1.0, true),
('pat_circular', 'Circular Round-Trip', 'Funds that originate from an account and return to the same account through a chain of transfers', 1000000, 72, 2, 1.0, true),
('pat_structuring', 'Structuring / Smurfing', 'Multiple transactions just below the ₹10 Lakh reporting threshold within a rolling time window', 999999, 72, 1, 1.0, true),
('pat_dormant', 'Dormant Account Reactivation', 'Account inactive for 6+ months suddenly initiating high-value transfers', 500000, 24, 1, 1.0, true),
('pat_kyc_mismatch', 'KYC Profile Mismatch', 'Transaction volume exceeds declared annual income by 3x or more within a 30-day window', 300000, 720, 1, 3.0, true)
ON CONFLICT (id) DO NOTHING;

-- Seed 60 accounts
INSERT INTO accounts (id, holder_name, bank_branch, account_type, declared_profession, declared_annual_income, created_at, last_activity_at, is_dormant, risk_score, risk_level) VALUES
-- Normal accounts (N01-N20)
('ACC_N01', 'Rajesh Kumar Sharma', 'Mumbai Main', 'savings', 'software_engineer', 1200000, now() - interval '3 years', now() - interval '1 day', false, 12, 'low'),
('ACC_N02', 'Priya Mehta', 'Delhi Central', 'savings', 'doctor', 2500000, now() - interval '2 years', now() - interval '2 days', false, 8, 'low'),
('ACC_N03', 'Suresh Patel', 'Ahmedabad West', 'current', 'business_owner', 5000000, now() - interval '4 years', now() - interval '1 day', false, 15, 'low'),
('ACC_N04', 'Anita Desai', 'Pune Shivajinagar', 'savings', 'teacher', 600000, now() - interval '5 years', now() - interval '3 days', false, 5, 'low'),
('ACC_N05', 'Vikram Singh', 'Bangalore Koramangala', 'savings', 'software_engineer', 1800000, now() - interval '2 years', now() - interval '1 day', false, 10, 'low'),
('ACC_N06', 'Sunita Rao', 'Chennai T Nagar', 'savings', 'accountant', 800000, now() - interval '3 years', now() - interval '4 days', false, 7, 'low'),
('ACC_N07', 'Mohan Lal Gupta', 'Kolkata Park Street', 'current', 'retailer', 1500000, now() - interval '6 years', now() - interval '2 days', false, 18, 'low'),
('ACC_N08', 'Kavya Nair', 'Kochi MG Road', 'savings', 'nurse', 500000, now() - interval '1 year', now() - interval '5 days', false, 6, 'low'),
('ACC_N09', 'Amit Shah', 'Surat Ring Road', 'current', 'manufacturer', 8000000, now() - interval '7 years', now() - interval '1 day', false, 20, 'low'),
('ACC_N10', 'Deepa Krishnamurthy', 'Hyderabad Jubilee Hills', 'savings', 'professor', 900000, now() - interval '4 years', now() - interval '6 days', false, 9, 'low'),
('ACC_N11', 'Ravi Shankar', 'Jaipur MI Road', 'savings', 'engineer', 750000, now() - interval '2 years', now() - interval '2 days', false, 11, 'low'),
('ACC_N12', 'Meera Agarwal', 'Lucknow Hazratganj', 'savings', 'lawyer', 1600000, now() - interval '3 years', now() - interval '1 day', false, 14, 'low'),
('ACC_N13', 'Sanjay Verma', 'Bhopal DB Mall', 'current', 'trader', 2000000, now() - interval '5 years', now() - interval '3 days', false, 16, 'low'),
('ACC_N14', 'Pooja Tiwari', 'Nagpur Sitabuldi', 'savings', 'homemaker', 400000, now() - interval '2 years', now() - interval '7 days', false, 4, 'low'),
('ACC_N15', 'Ashok Joshi', 'Indore Vijay Nagar', 'savings', 'pharmacist', 700000, now() - interval '4 years', now() - interval '4 days', false, 8, 'low'),
('ACC_N16', 'Lalita Choudhary', 'Patna Gandhi Maidan', 'savings', 'salaried', 450000, now() - interval '1 year', now() - interval '3 days', false, 6, 'low'),
('ACC_N17', 'Dinesh Kapoor', 'Chandigarh Sector 17', 'current', 'contractor', 3000000, now() - interval '6 years', now() - interval '2 days', false, 22, 'low'),
('ACC_N18', 'Smita Bhatt', 'Vadodara Alkapuri', 'savings', 'dentist', 1100000, now() - interval '3 years', now() - interval '5 days', false, 10, 'low'),
('ACC_N19', 'Prakash Reddy', 'Vijayawada Benz Circle', 'savings', 'software_engineer', 1400000, now() - interval '2 years', now() - interval '1 day', false, 13, 'low'),
('ACC_N20', 'Harini Subramanian', 'Coimbatore RS Puram', 'savings', 'manager', 950000, now() - interval '4 years', now() - interval '6 days', false, 9, 'low'),
('ACC_N21', 'Aman Verma', 'Mumbai Main', 'savings', 'salaried', 1500000, now() - interval '2 years', now() - interval '3 days', false, 10, 'low'),
('ACC_N22', 'Ritu Sen', 'Delhi Central', 'savings', 'designer', 1100000, now() - interval '1 year', now() - interval '4 days', false, 12, 'low'),
('ACC_N23', 'Kunal Shah', 'Ahmedabad West', 'current', 'consultant', 2200000, now() - interval '3 years', now() - interval '1 day', false, 14, 'low'),
('ACC_N24', 'Neha Kapoor', 'Pune Shivajinagar', 'savings', 'writer', 800000, now() - interval '2 years', now() - interval '5 days', false, 8, 'low'),
('ACC_N25', 'Siddharth Roy', 'Bangalore Koramangala', 'savings', 'analyst', 1300000, now() - interval '1 year', now() - interval '2 days', false, 11, 'low'),
('ACC_N26', 'Meenakshi Iyer', 'Chennai T Nagar', 'savings', 'architect', 1700000, now() - interval '4 years', now() - interval '6 days', false, 9, 'low'),
('ACC_N27', 'Gautam Banerjee', 'Kolkata Park Street', 'current', 'exporter', 6000000, now() - interval '5 years', now() - interval '1 day', false, 16, 'low'),
('ACC_N28', 'Anjali Menon', 'Kochi MG Road', 'savings', 'researcher', 950000, now() - interval '2 years', now() - interval '3 days', false, 7, 'low'),
('ACC_N29', 'Hardik Patel', 'Surat Ring Road', 'current', 'textile_owner', 7500000, now() - interval '6 years', now() - interval '2 days', false, 15, 'low'),
('ACC_N30', 'Vasundhara Raju', 'Hyderabad Jubilee Hills', 'savings', 'scientist', 2100000, now() - interval '3 years', now() - interval '4 days', false, 10, 'low'),
('ACC_N31', 'Abhishek Mishra', 'Jaipur MI Road', 'savings', 'merchant', 1250000, now() - interval '2 years', now() - interval '1 day', false, 13, 'low'),
('ACC_N32', 'Kiran Rastogi', 'Lucknow Hazratganj', 'savings', 'artist', 650000, now() - interval '4 years', now() - interval '7 days', false, 6, 'low'),
('ACC_N33', 'Devendra Yadav', 'Bhopal DB Mall', 'current', 'builder', 4500000, now() - interval '5 years', now() - interval '2 days', false, 18, 'low'),
('ACC_N34', 'Shalini Deshmukh', 'Nagpur Sitabuldi', 'savings', 'officer', 850000, now() - interval '3 years', now() - interval '5 days', false, 9, 'low'),
('ACC_N35', 'Sandeep Malviya', 'Indore Vijay Nagar', 'savings', 'salaried', 1050000, now() - interval '2 years', now() - interval '3 days', false, 11, 'low'),
('ACC_N36', 'Prerna Jha', 'Patna Gandhi Maidan', 'savings', 'academic', 750000, now() - interval '1 year', now() - interval '6 days', false, 8, 'low'),
('ACC_N37', 'Sarabjit Singh', 'Chandigarh Sector 17', 'current', 'farmer_agent', 3500000, now() - interval '6 years', now() - interval '1 day', false, 19, 'low'),
('ACC_N38', 'Tanvi Mehta', 'Vadodara Alkapuri', 'savings', 'salaried', 1200000, now() - interval '3 years', now() - interval '4 days', false, 10, 'low'),
('ACC_N39', 'Raghavendra Rao', 'Vijayawada Benz Circle', 'savings', 'accountant', 900000, now() - interval '2 years', now() - interval '5 days', false, 8, 'low'),
('ACC_N40', 'Sujatha Chandran', 'Coimbatore RS Puram', 'savings', 'salaried', 1150000, now() - interval '4 years', now() - interval '2 days', false, 9, 'low'),

-- Multi-hop layering accounts (A01-A06)
('ACC_A01', 'Prakash Dubey', 'Mumbai Fort', 'current', 'consultant', 1000000, now() - interval '1 year', now() - interval '2 days', false, 78, 'high'),
('ACC_A02', 'Mehul Vyas Trading Co', 'Mumbai Andheri', 'current', 'trading', 3000000, now() - interval '2 years', now() - interval '2 days', false, 72, 'high'),
('ACC_A03', 'Sunrise Imports Pvt Ltd', 'Navi Mumbai', 'current', 'import_export', 5000000, now() - interval '3 years', now() - interval '2 days', false, 68, 'high'),
('ACC_A04', 'Global Ventures LLC', 'Thane', 'current', 'investment', 2000000, now() - interval '1 year', now() - interval '2 days', false, 75, 'high'),
('ACC_A05', 'Offshore Holdings Trust', 'Mumbai BKC', 'current', 'financial_services', 10000000, now() - interval '6 months', now() - interval '2 days', false, 85, 'critical'),
('ACC_A06', 'Final Recipient Shell', 'Mumbai Lower Parel', 'current', 'real_estate', 8000000, now() - interval '4 months', now() - interval '2 days', false, 82, 'critical'),

-- Circular round-trip accounts (B01-B04)
('ACC_B01', 'Kiran Enterprises', 'Delhi Connaught Place', 'current', 'retail', 2000000, now() - interval '2 years', now() - interval '1 day', false, 71, 'high'),
('ACC_B02', 'Phoenix Distributors', 'Delhi Karol Bagh', 'current', 'distribution', 1500000, now() - interval '1 year', now() - interval '1 day', false, 68, 'high'),
('ACC_B03', 'Metro Logistics', 'Noida Sector 18', 'current', 'logistics', 2500000, now() - interval '3 years', now() - interval '1 day', false, 65, 'high'),
('ACC_B04', 'Capital Bridge Finance', 'Gurgaon DLF', 'current', 'financial_services', 4000000, now() - interval '2 years', now() - interval '1 day', false, 73, 'high'),

-- Structuring accounts (C01-C05)
('ACC_C01', 'Ramesh Narayan Patil', 'Pune Deccan', 'savings', 'shopkeeper', 600000, now() - interval '3 years', now() - interval '1 day', false, 65, 'high'),
('ACC_C02', 'Ganesh Hardware Store', 'Pune Pimpri', 'current', 'retail', 800000, now() - interval '2 years', now() - interval '1 day', false, 58, 'medium'),
('ACC_C03', 'Laxmi Jewellers', 'Pune Shivaji Market', 'current', 'jewellery', 1200000, now() - interval '4 years', now() - interval '2 days', false, 55, 'medium'),
('ACC_C04', 'Bajrang Textiles', 'Pune Camp', 'current', 'textiles', 900000, now() - interval '3 years', now() - interval '3 days', false, 52, 'medium'),
('ACC_C05', 'Vinayak Sweets', 'Pune Katraj', 'savings', 'food_business', 700000, now() - interval '2 years', now() - interval '2 days', false, 48, 'medium'),

-- Dormant reactivation accounts (D01-D03)
('ACC_D01', 'Sudhir Malhotra', 'Kolkata Salt Lake', 'savings', 'retired', 300000, now() - interval '10 years', now() - interval '2 hours', false, 76, 'high'),
('ACC_D02', 'Eastern Traders Consortium', 'Kolkata Burrabazar', 'current', 'trading', 5000000, now() - interval '1 year', now() - interval '2 hours', false, 70, 'high'),
('ACC_D03', 'Howrah Bridge Investments', 'Kolkata Howrah', 'current', 'investment', 8000000, now() - interval '6 months', now() - interval '3 hours', false, 67, 'high'),

-- KYC mismatch accounts (E01-E04)
('ACC_E01', 'Raju Prasad Yadav', 'Patna Boring Road', 'savings', 'daily_wage_worker', 120000, now() - interval '2 years', now() - interval '1 day', false, 88, 'critical'),
('ACC_E02', 'Shree Ram Cash & Carry', 'Patna Ashiana', 'current', 'grocery', 600000, now() - interval '3 years', now() - interval '1 day', false, 72, 'high'),
('ACC_E03', 'Jai Ambey Trading', 'Varanasi Lanka', 'current', 'trading', 800000, now() - interval '2 years', now() - interval '2 days', false, 68, 'high'),
('ACC_E04', 'New Age Commodities', 'Allahabad Civil Lines', 'current', 'commodities', 1200000, now() - interval '1 year', now() - interval '2 days', false, 64, 'high'),

-- Additional medium-risk accounts (M01-M15)
('ACC_M01', 'Farhan Ansari', 'Mumbai Dharavi', 'savings', 'tailor', 360000, now() - interval '4 years', now() - interval '5 days', false, 35, 'medium'),
('ACC_M02', 'Savita Kamble', 'Pune Hadapsar', 'savings', 'factory_worker', 280000, now() - interval '3 years', now() - interval '8 days', false, 28, 'medium'),
('ACC_M03', 'Nikhil Marathe', 'Nashik CBS', 'current', 'agriculture', 700000, now() - interval '5 years', now() - interval '4 days', false, 32, 'medium'),
('ACC_M04', 'Heena Shaikh', 'Aurangabad Cidco', 'savings', 'student', 180000, now() - interval '1 year', now() - interval '10 days', false, 25, 'medium'),
('ACC_M05', 'Santosh Gaikwad', 'Solapur Market', 'current', 'vegetable_vendor', 240000, now() - interval '6 years', now() - interval '6 days', false, 30, 'medium'),
('ACC_M06', 'Rekha Jadhav', 'Kolhapur Rajaram', 'savings', 'domestic_worker', 150000, now() - interval '2 years', now() - interval '12 days', false, 22, 'medium'),
('ACC_M07', 'Dilip Nayak', 'Bhubaneswar Saheed Nagar', 'savings', 'driver', 200000, now() - interval '3 years', now() - interval '9 days', false, 27, 'medium'),
('ACC_M08', 'Kamla Devi', 'Agra Sanjay Place', 'savings', 'farmer', 190000, now() - interval '7 years', now() - interval '15 days', false, 20, 'medium'),
('ACC_M09', 'Rohit Pandey', 'Kanpur Mall Road', 'savings', 'student', 160000, now() - interval '1 year', now() - interval '7 days', false, 24, 'medium'),
('ACC_M10', 'Uma Shankar', 'Varanasi Godowlia', 'savings', 'priest', 240000, now() - interval '8 years', now() - interval '20 days', false, 18, 'medium'),
('ACC_M11', 'Fatima Begum', 'Hyderabad Old City', 'savings', 'homemaker', 0, now() - interval '5 years', now() - interval '11 days', false, 26, 'medium'),
('ACC_M12', 'Joseph Thomas', 'Thiruvananthapuram Kowdiar', 'savings', 'plumber', 320000, now() - interval '2 years', now() - interval '8 days', false, 29, 'medium'),
('ACC_M13', 'Arjun Pillai', 'Kochi Edappally', 'savings', 'fisherman', 280000, now() - interval '4 years', now() - interval '14 days', false, 23, 'medium'),
('ACC_M14', 'Nalini Devi', 'Chennai Mylapore', 'savings', 'cook', 260000, now() - interval '3 years', now() - interval '9 days', false, 21, 'medium'),
('ACC_M15', 'Muthu Krishnan', 'Madurai South Masi Street', 'current', 'small_business', 450000, now() - interval '6 years', now() - interval '5 days', false, 33, 'medium'),
-- Fan-Out/Fan-In Pattern Accounts (F01-F08)
('ACC_F01', 'Vikram Enterprises Hub', 'Mumbai Main', 'current', 'trading', 12000000, now() - interval '1 year', now() - interval '1 day', false, 84, 'critical'),
('ACC_F02', 'F_Dest_01', 'Pune Shivajinagar', 'savings', 'salaried', 500000, now() - interval '2 years', now() - interval '1 day', false, 45, 'medium'),
('ACC_F03', 'F_Dest_02', 'Delhi Central', 'savings', 'salaried', 600000, now() - interval '2 years', now() - interval '1 day', false, 48, 'medium'),
('ACC_F04', 'F_Dest_03', 'Ahmedabad West', 'savings', 'salaried', 400000, now() - interval '3 years', now() - interval '1 day', false, 42, 'medium'),
('ACC_F05', 'F_Dest_04', 'Chennai T Nagar', 'savings', 'salaried', 700000, now() - interval '1 year', now() - interval '1 day', false, 51, 'medium'),
('ACC_F06', 'F_Dest_05', 'Kolkata Park Street', 'savings', 'salaried', 550000, now() - interval '2 years', now() - interval '1 day', false, 44, 'medium'),
('ACC_F07', 'F_Dest_06', 'Bangalore Koramangala', 'savings', 'salaried', 800000, now() - interval '3 years', now() - interval '1 day', false, 49, 'medium'),
('ACC_F08', 'Consolidated Aggregations', 'Mumbai Main', 'current', 'trading', 15000000, now() - interval '1 year', now() - interval '1 day', false, 82, 'critical'),
-- Velocity Spike Accounts (V01-V03)
('ACC_V01', 'Anand Sharma Rapid', 'Delhi Central', 'savings', 'trader', 1800000, now() - interval '2 years', now() - interval '1 hour', false, 79, 'high'),
('ACC_V02', 'Karan Johar Rapid', 'Mumbai Main', 'savings', 'salaried', 2400000, now() - interval '1 year', now() - interval '2 hours', false, 72, 'high'),
('ACC_V03', 'Siddharth Malhotra Rapid', 'Bangalore Koramangala', 'savings', 'trader', 3100000, now() - interval '3 years', now() - interval '3 hours', false, 75, 'high'),
-- Cross Border Layering Accounts (X01-X06)
('ACC_X01', 'Delhi Exports Gateway', 'Delhi Central', 'current', 'export', 9000000, now() - interval '2 years', now() - interval '1 day', false, 81, 'critical'),
('ACC_X02', 'Mumbai Imports Intermediate', 'Mumbai Main', 'current', 'import', 8000000, now() - interval '2 years', now() - interval '1 day', false, 78, 'high'),
('ACC_X03', 'Kolkata Trading Intermediate', 'Kolkata Park Street', 'current', 'trading', 7500000, now() - interval '3 years', now() - interval '1 day', false, 74, 'high'),
('ACC_X04', 'Chennai Ventures Intermediate', 'Chennai T Nagar', 'current', 'investment', 6000000, now() - interval '1 year', now() - interval '1 day', false, 71, 'high'),
('ACC_X05', 'Bangalore Logistics Intermediate', 'Bangalore Koramangala', 'current', 'logistics', 8500000, now() - interval '2 years', now() - interval '1 day', false, 76, 'high'),
('ACC_X06', 'Hyderabad Holdings Final', 'Hyderabad Jubilee Hills', 'current', 'holding', 11000000, now() - interval '1 year', now() - interval '1 day', false, 85, 'critical')
ON CONFLICT (id) DO NOTHING;

-- Update dormant account
UPDATE accounts SET is_dormant = true, last_activity_at = now() - interval '8 months' WHERE id = 'ACC_D01';

-- Seed transactions - Normal transactions
INSERT INTO transactions (id, sender_account_id, receiver_account_id, amount, channel, reference_number, status, timestamp) VALUES
-- Normal daily transactions
('TXN_N001', 'ACC_N01', 'ACC_N02', 45000, 'NEFT', 'NEFT2024051001', 'completed', now() - interval '5 days'),
('TXN_N002', 'ACC_N03', 'ACC_N04', 120000, 'RTGS', 'RTGS2024051002', 'completed', now() - interval '4 days'),
('TXN_N003', 'ACC_N05', 'ACC_N06', 8500, 'UPI', 'UPI2024051003', 'completed', now() - interval '4 days'),
('TXN_N004', 'ACC_N07', 'ACC_N08', 25000, 'NEFT', 'NEFT2024051004', 'completed', now() - interval '3 days'),
('TXN_N005', 'ACC_N09', 'ACC_N10', 500000, 'RTGS', 'RTGS2024051005', 'completed', now() - interval '3 days'),
('TXN_N006', 'ACC_N11', 'ACC_N12', 15000, 'UPI', 'UPI2024051006', 'completed', now() - interval '2 days'),
('TXN_N007', 'ACC_N13', 'ACC_N14', 75000, 'NEFT', 'NEFT2024051007', 'completed', now() - interval '2 days'),
('TXN_N008', 'ACC_N15', 'ACC_N16', 35000, 'NEFT', 'NEFT2024051008', 'completed', now() - interval '1 day'),
('TXN_N009', 'ACC_N17', 'ACC_N18', 250000, 'RTGS', 'RTGS2024051009', 'completed', now() - interval '1 day'),
('TXN_N010', 'ACC_N19', 'ACC_N20', 12000, 'UPI', 'UPI2024051010', 'completed', now() - interval '6 hours'),
('TXN_N011', 'ACC_N01', 'ACC_N05', 65000, 'NEFT', 'NEFT2024051011', 'completed', now() - interval '8 days'),
('TXN_N012', 'ACC_N02', 'ACC_N09', 380000, 'RTGS', 'RTGS2024051012', 'completed', now() - interval '7 days'),
('TXN_N013', 'ACC_N03', 'ACC_N07', 95000, 'NEFT', 'NEFT2024051013', 'completed', now() - interval '9 days'),
('TXN_N014', 'ACC_N10', 'ACC_N15', 42000, 'UPI', 'UPI2024051014', 'completed', now() - interval '10 days'),
('TXN_N015', 'ACC_N04', 'ACC_N11', 28000, 'NEFT', 'NEFT2024051015', 'completed', now() - interval '11 days'),
('TXN_N016', 'ACC_N06', 'ACC_N13', 56000, 'NEFT', 'NEFT2024051016', 'completed', now() - interval '12 days'),
('TXN_N017', 'ACC_N08', 'ACC_N17', 195000, 'RTGS', 'RTGS2024051017', 'completed', now() - interval '13 days'),
('TXN_N018', 'ACC_N12', 'ACC_N19', 88000, 'NEFT', 'NEFT2024051018', 'completed', now() - interval '14 days'),
('TXN_N019', 'ACC_N14', 'ACC_N20', 19000, 'UPI', 'UPI2024051019', 'completed', now() - interval '15 days'),
('TXN_N020', 'ACC_N16', 'ACC_N18', 33000, 'NEFT', 'NEFT2024051020', 'completed', now() - interval '16 days'),

-- Multi-hop layering chain (A01 → A02 → A03 → A04 → A05 → A06)
('TXN_A001', 'ACC_A01', 'ACC_A02', 4200000, 'RTGS', 'RTGS2024ML001', 'completed', now() - interval '2 days' - interval '10 hours'),
('TXN_A002', 'ACC_A02', 'ACC_A03', 4150000, 'RTGS', 'RTGS2024ML002', 'completed', now() - interval '2 days' - interval '8 hours'),
('TXN_A003', 'ACC_A03', 'ACC_A04', 4100000, 'RTGS', 'RTGS2024ML003', 'completed', now() - interval '2 days' - interval '6 hours'),
('TXN_A004', 'ACC_A04', 'ACC_A05', 4050000, 'RTGS', 'RTGS2024ML004', 'completed', now() - interval '2 days' - interval '4 hours'),
('TXN_A005', 'ACC_A05', 'ACC_A06', 4000000, 'RTGS', 'RTGS2024ML005', 'completed', now() - interval '2 days' - interval '2 hours'),
-- Second layering chain
('TXN_A006', 'ACC_A01', 'ACC_A03', 2800000, 'RTGS', 'RTGS2024ML006', 'completed', now() - interval '5 days'),
('TXN_A007', 'ACC_A03', 'ACC_A05', 2750000, 'RTGS', 'RTGS2024ML007', 'completed', now() - interval '5 days' + interval '3 hours'),
('TXN_A008', 'ACC_A05', 'ACC_A06', 2700000, 'RTGS', 'RTGS2024ML008', 'completed', now() - interval '5 days' + interval '6 hours'),

-- Circular round-trip (B01 → B02 → B03 → B04 → B01)
('TXN_B001', 'ACC_B01', 'ACC_B02', 1850000, 'RTGS', 'RTGS2024CR001', 'completed', now() - interval '1 day' - interval '12 hours'),
('TXN_B002', 'ACC_B02', 'ACC_B03', 1800000, 'RTGS', 'RTGS2024CR002', 'completed', now() - interval '1 day' - interval '9 hours'),
('TXN_B003', 'ACC_B03', 'ACC_B04', 1750000, 'RTGS', 'RTGS2024CR003', 'completed', now() - interval '1 day' - interval '6 hours'),
('TXN_B004', 'ACC_B04', 'ACC_B01', 1700000, 'RTGS', 'RTGS2024CR004', 'completed', now() - interval '1 day' - interval '3 hours'),
-- Second round-trip
('TXN_B005', 'ACC_B01', 'ACC_B03', 950000, 'NEFT', 'NEFT2024CR005', 'completed', now() - interval '4 days'),
('TXN_B006', 'ACC_B03', 'ACC_B02', 920000, 'NEFT', 'NEFT2024CR006', 'completed', now() - interval '4 days' + interval '4 hours'),
('TXN_B007', 'ACC_B02', 'ACC_B04', 900000, 'NEFT', 'NEFT2024CR007', 'completed', now() - interval '4 days' + interval '8 hours'),
('TXN_B008', 'ACC_B04', 'ACC_B01', 880000, 'NEFT', 'NEFT2024CR008', 'completed', now() - interval '4 days' + interval '12 hours'),

-- Structuring transactions (C01 sending just below 10L threshold repeatedly)
('TXN_C001', 'ACC_C01', 'ACC_C02', 980000, 'NEFT', 'NEFT2024ST001', 'completed', now() - interval '3 days' - interval '18 hours'),
('TXN_C002', 'ACC_C01', 'ACC_C03', 975000, 'NEFT', 'NEFT2024ST002', 'completed', now() - interval '3 days' - interval '12 hours'),
('TXN_C003', 'ACC_C01', 'ACC_C04', 985000, 'NEFT', 'NEFT2024ST003', 'completed', now() - interval '3 days' - interval '6 hours'),
('TXN_C004', 'ACC_C01', 'ACC_C05', 970000, 'NEFT', 'NEFT2024ST004', 'completed', now() - interval '3 days'),
('TXN_C005', 'ACC_C01', 'ACC_C02', 990000, 'NEFT', 'NEFT2024ST005', 'completed', now() - interval '2 days'),
('TXN_C006', 'ACC_C01', 'ACC_C03', 960000, 'NEFT', 'NEFT2024ST006', 'completed', now() - interval '2 days' + interval '8 hours'),
('TXN_C007', 'ACC_C01', 'ACC_C04', 978000, 'NEFT', 'NEFT2024ST007', 'completed', now() - interval '1 day'),
('TXN_C008', 'ACC_C01', 'ACC_C05', 988000, 'NEFT', 'NEFT2024ST008', 'completed', now() - interval '12 hours'),
('TXN_C009', 'ACC_C02', 'ACC_N01', 500000, 'NEFT', 'NEFT2024ST009', 'completed', now() - interval '2 days' + interval '3 hours'),
('TXN_C010', 'ACC_C03', 'ACC_N05', 600000, 'RTGS', 'RTGS2024ST010', 'completed', now() - interval '1 day' + interval '5 hours'),

-- Dormant reactivation (D01 was dormant 8 months, now high-value transfer)
('TXN_D001', 'ACC_D01', 'ACC_D02', 7500000, 'RTGS', 'RTGS2024DR001', 'completed', now() - interval '2 hours'),
('TXN_D002', 'ACC_D02', 'ACC_D03', 7200000, 'RTGS', 'RTGS2024DR002', 'completed', now() - interval '1 hour'),
('TXN_D003', 'ACC_D03', 'ACC_A06', 7000000, 'RTGS', 'RTGS2024DR003', 'completed', now() - interval '30 minutes'),

-- KYC mismatch (E01 declared income 1.2L/year but transacts 45L in 30 days)
('TXN_E001', 'ACC_E02', 'ACC_E01', 4800000, 'NEFT', 'NEFT2024KM001', 'completed', now() - interval '25 days'),
('TXN_E002', 'ACC_E03', 'ACC_E01', 5200000, 'NEFT', 'NEFT2024KM002', 'completed', now() - interval '22 days'),
('TXN_E003', 'ACC_E04', 'ACC_E01', 4500000, 'NEFT', 'NEFT2024KM003', 'completed', now() - interval '18 days'),
('TXN_E004', 'ACC_E01', 'ACC_E03', 6800000, 'RTGS', 'RTGS2024KM004', 'completed', now() - interval '15 days'),
('TXN_E005', 'ACC_E01', 'ACC_E04', 7200000, 'RTGS', 'RTGS2024KM005', 'completed', now() - interval '10 days'),
('TXN_E006', 'ACC_E02', 'ACC_E01', 3900000, 'NEFT', 'NEFT2024KM006', 'completed', now() - interval '7 days'),
('TXN_E007', 'ACC_E01', 'ACC_E02', 5600000, 'RTGS', 'RTGS2024KM007', 'completed', now() - interval '4 days'),
('TXN_E008', 'ACC_E03', 'ACC_E01', 3200000, 'NEFT', 'NEFT2024KM008', 'completed', now() - interval '2 days'),

-- Medium risk account transactions
('TXN_M001', 'ACC_M01', 'ACC_N01', 15000, 'UPI', 'UPI2024MD001', 'completed', now() - interval '3 days'),
('TXN_M002', 'ACC_M03', 'ACC_N03', 85000, 'NEFT', 'NEFT2024MD002', 'completed', now() - interval '5 days'),
('TXN_M003', 'ACC_M05', 'ACC_N07', 45000, 'NEFT', 'NEFT2024MD003', 'completed', now() - interval '7 days'),
('TXN_M004', 'ACC_M07', 'ACC_N09', 35000, 'UPI', 'UPI2024MD004', 'completed', now() - interval '9 days'),
('TXN_M005', 'ACC_M09', 'ACC_N11', 22000, 'NEFT', 'NEFT2024MD005', 'completed', now() - interval '11 days'),
('TXN_M006', 'ACC_M11', 'ACC_N13', 55000, 'NEFT', 'NEFT2024MD006', 'completed', now() - interval '13 days'),
('TXN_M007', 'ACC_M13', 'ACC_N15', 48000, 'UPI', 'UPI2024MD007', 'completed', now() - interval '15 days'),
('TXN_M008', 'ACC_M15', 'ACC_N17', 125000, 'NEFT', 'NEFT2024MD008', 'completed', now() - interval '17 days'),
('TXN_M009', 'ACC_N02', 'ACC_M02', 18000, 'UPI', 'UPI2024MD009', 'completed', now() - interval '4 days'),
('TXN_M010', 'ACC_N04', 'ACC_M04', 9500, 'UPI', 'UPI2024MD010', 'completed', now() - interval '6 days'),
('TXN_M011', 'ACC_N06', 'ACC_M06', 12000, 'UPI', 'UPI2024MD011', 'completed', now() - interval '8 days'),
('TXN_M012', 'ACC_N08', 'ACC_M08', 28000, 'NEFT', 'NEFT2024MD012', 'completed', now() - interval '10 days'),
('TXN_M013', 'ACC_N10', 'ACC_M10', 42000, 'NEFT', 'NEFT2024MD013', 'completed', now() - interval '12 days'),
('TXN_M014', 'ACC_N12', 'ACC_M12', 65000, 'NEFT', 'NEFT2024MD014', 'completed', now() - interval '14 days'),
('TXN_M015', 'ACC_N14', 'ACC_M14', 32000, 'NEFT', 'NEFT2024MD015', 'completed', now() - interval '16 days'),
('TXN_M016', 'ACC_M02', 'ACC_M04', 11000, 'UPI', 'UPI2024MD016', 'completed', now() - interval '2 days'),
('TXN_M017', 'ACC_M06', 'ACC_M08', 8500, 'UPI', 'UPI2024MD017', 'completed', now() - interval '4 days'),
('TXN_M018', 'ACC_M10', 'ACC_M12', 16000, 'NEFT', 'NEFT2024MD018', 'completed', now() - interval '6 days'),
('TXN_M019', 'ACC_M14', 'ACC_M01', 24000, 'UPI', 'UPI2024MD019', 'completed', now() - interval '8 days'),
('TXN_M020', 'ACC_M03', 'ACC_M15', 58000, 'NEFT', 'NEFT2024MD020', 'completed', now() - interval '10 days'),

-- Additional recent transactions for today feed
('TXN_T001', 'ACC_N01', 'ACC_N03', 180000, 'RTGS', 'RTGS2024TD001', 'completed', now() - interval '30 minutes'),
('TXN_T002', 'ACC_N05', 'ACC_N12', 42000, 'NEFT', 'NEFT2024TD002', 'completed', now() - interval '45 minutes'),
('TXN_T003', 'ACC_N09', 'ACC_N17', 650000, 'RTGS', 'RTGS2024TD003', 'completed', now() - interval '1 hour'),
('TXN_T004', 'ACC_M07', 'ACC_N19', 28000, 'UPI', 'UPI2024TD004', 'completed', now() - interval '1 hour 15 minutes'),
('TXN_T005', 'ACC_N11', 'ACC_N14', 15500, 'UPI', 'UPI2024TD005', 'completed', now() - interval '1 hour 30 minutes'),
('TXN_T006', 'ACC_A01', 'ACC_A02', 3500000, 'RTGS', 'RTGS2024TD006', 'pending', now() - interval '20 minutes'),
('TXN_T007', 'ACC_C01', 'ACC_C02', 995000, 'NEFT', 'NEFT2024TD007', 'completed', now() - interval '15 minutes'),
('TXN_T008', 'ACC_N13', 'ACC_N18', 88000, 'NEFT', 'NEFT2024TD008', 'completed', now() - interval '2 hours'),
('TXN_T009', 'ACC_N07', 'ACC_N16', 55000, 'NEFT', 'NEFT2024TD009', 'completed', now() - interval '2 hours 30 minutes'),
('TXN_T010', 'ACC_N20', 'ACC_N04', 22000, 'UPI', 'UPI2024TD010', 'completed', now() - interval '3 hours'),
-- Additional normal transactions (N021-N060)
('TXN_N021', 'ACC_N21', 'ACC_N22', 75000, 'NEFT', 'NEFT2024N021', 'completed', now() - interval '4 days'),
('TXN_N022', 'ACC_N23', 'ACC_N24', 140000, 'RTGS', 'RTGS2024N022', 'completed', now() - interval '3 days'),
('TXN_N023', 'ACC_N25', 'ACC_N26', 15000, 'UPI', 'UPI2024N023', 'completed', now() - interval '3 days'),
('TXN_N024', 'ACC_N27', 'ACC_N28', 35000, 'NEFT', 'NEFT2024N024', 'completed', now() - interval '2 days'),
('TXN_N025', 'ACC_N29', 'ACC_N30', 600000, 'RTGS', 'RTGS2024N025', 'completed', now() - interval '2 days'),
('TXN_N026', 'ACC_N31', 'ACC_N32', 25000, 'UPI', 'UPI2024N026', 'completed', now() - interval '1 day'),
('TXN_N027', 'ACC_N33', 'ACC_N34', 85000, 'NEFT', 'NEFT2024N027', 'completed', now() - interval '1 day'),
('TXN_N028', 'ACC_N35', 'ACC_N36', 45000, 'NEFT', 'NEFT2024N028', 'completed', now() - interval '12 hours'),
('TXN_N029', 'ACC_N37', 'ACC_N38', 300000, 'RTGS', 'RTGS2024N029', 'completed', now() - interval '8 hours'),
('TXN_N030', 'ACC_N39', 'ACC_N40', 18000, 'UPI', 'UPI2024N030', 'completed', now() - interval '4 hours'),
('TXN_N031', 'ACC_N21', 'ACC_N25', 95000, 'NEFT', 'NEFT2024N031', 'completed', now() - interval '5 days'),
('TXN_N032', 'ACC_N22', 'ACC_N29', 420000, 'RTGS', 'RTGS2024N032', 'completed', now() - interval '5 days'),
('TXN_N033', 'ACC_N23', 'ACC_N27', 115000, 'NEFT', 'NEFT2024N033', 'completed', now() - interval '4 days'),
('TXN_N034', 'ACC_N30', 'ACC_N35', 52000, 'UPI', 'UPI2024N034', 'completed', now() - interval '4 days'),
('TXN_N035', 'ACC_N24', 'ACC_N31', 38000, 'NEFT', 'NEFT2024N035', 'completed', now() - interval '3 days'),
('TXN_N036', 'ACC_N26', 'ACC_N33', 76000, 'NEFT', 'NEFT2024N036', 'completed', now() - interval '3 days'),
('TXN_N037', 'ACC_N28', 'ACC_N37', 225000, 'RTGS', 'RTGS2024N037', 'completed', now() - interval '2 days'),
('TXN_N038', 'ACC_N32', 'ACC_N39', 98000, 'NEFT', 'NEFT2024N038', 'completed', now() - interval '2 days'),
('TXN_N039', 'ACC_N34', 'ACC_N40', 25000, 'UPI', 'UPI2024N039', 'completed', now() - interval '1 day'),
('TXN_N040', 'ACC_N36', 'ACC_N38', 43000, 'NEFT', 'NEFT2024N040', 'completed', now() - interval '1 day'),
-- Fan-Out / Fan-In Transactions (F01-F08)
('TXN_F001', 'ACC_F01', 'ACC_F02', 1500000, 'NEFT', 'NEFT2024F001', 'completed', now() - interval '1 day' - interval '12 hours'),
('TXN_F002', 'ACC_F01', 'ACC_F03', 1600000, 'NEFT', 'NEFT2024F002', 'completed', now() - interval '1 day' - interval '12 hours'),
('TXN_F003', 'ACC_F01', 'ACC_F04', 1400000, 'NEFT', 'NEFT2024F003', 'completed', now() - interval '1 day' - interval '12 hours'),
('TXN_F004', 'ACC_F01', 'ACC_F05', 1700000, 'NEFT', 'NEFT2024F004', 'completed', now() - interval '1 day' - interval '12 hours'),
('TXN_F005', 'ACC_F01', 'ACC_F06', 1550000, 'NEFT', 'NEFT2024F005', 'completed', now() - interval '1 day' - interval '12 hours'),
('TXN_F006', 'ACC_F01', 'ACC_F07', 1650000, 'NEFT', 'NEFT2024F006', 'completed', now() - interval '1 day' - interval '12 hours'),
('TXN_F007', 'ACC_F02', 'ACC_F08', 1480000, 'NEFT', 'NEFT2024F007', 'completed', now() - interval '1 day' - interval '10 hours'),
('TXN_F008', 'ACC_F03', 'ACC_F08', 1580000, 'NEFT', 'NEFT2024F008', 'completed', now() - interval '1 day' - interval '10 hours'),
('TXN_F009', 'ACC_F04', 'ACC_F08', 1380000, 'NEFT', 'NEFT2024F009', 'completed', now() - interval '1 day' - interval '10 hours'),
('TXN_F010', 'ACC_F05', 'ACC_F08', 1680000, 'NEFT', 'NEFT2024F010', 'completed', now() - interval '1 day' - interval '10 hours'),
('TXN_F011', 'ACC_F06', 'ACC_F08', 1530000, 'NEFT', 'NEFT2024F011', 'completed', now() - interval '1 day' - interval '10 hours'),
('TXN_F012', 'ACC_F07', 'ACC_F08', 1630000, 'NEFT', 'NEFT2024F012', 'completed', now() - interval '1 day' - interval '10 hours'),
-- Velocity Spike Transactions
('TXN_V001', 'ACC_V01', 'ACC_N21', 150000, 'UPI', 'UPI2024V001', 'completed', now() - interval '10 hours'),
('TXN_V002', 'ACC_V01', 'ACC_N22', 120000, 'UPI', 'UPI2024V002', 'completed', now() - interval '9 hours 30 minutes'),
('TXN_V003', 'ACC_V01', 'ACC_N23', 130000, 'UPI', 'UPI2024V003', 'completed', now() - interval '9 hours'),
('TXN_V004', 'ACC_V01', 'ACC_N24', 160000, 'UPI', 'UPI2024V004', 'completed', now() - interval '8 hours 30 minutes'),
('TXN_V005', 'ACC_V01', 'ACC_N25', 140000, 'UPI', 'UPI2024V005', 'completed', now() - interval '8 hours'),
('TXN_V006', 'ACC_V01', 'ACC_N26', 150000, 'UPI', 'UPI2024V006', 'completed', now() - interval '7 hours 30 minutes'),
('TXN_V007', 'ACC_V01', 'ACC_N27', 170000, 'UPI', 'UPI2024V007', 'completed', now() - interval '7 hours'),
('TXN_V008', 'ACC_V01', 'ACC_N28', 110000, 'UPI', 'UPI2024V008', 'completed', now() - interval '6 hours 30 minutes'),
('TXN_V009', 'ACC_V01', 'ACC_N29', 125000, 'UPI', 'UPI2024V009', 'completed', now() - interval '6 hours'),
('TXN_V010', 'ACC_V01', 'ACC_N30', 135000, 'UPI', 'UPI2024V010', 'completed', now() - interval '5 hours 30 minutes'),
('TXN_V011', 'ACC_V01', 'ACC_N31', 145000, 'UPI', 'UPI2024V011', 'completed', now() - interval '5 hours'),
('TXN_V012', 'ACC_V01', 'ACC_N32', 155000, 'UPI', 'UPI2024V012', 'completed', now() - interval '4 hours 30 minutes'),
-- Cross-Border Layering Transactions (X01 -> X02 -> X03 -> X04 -> X05 -> X06)
('TXN_X001', 'ACC_X01', 'ACC_X02', 8500000, 'RTGS', 'RTGS2024X001', 'completed', now() - interval '2 days' - interval '10 hours'),
('TXN_X002', 'ACC_X02', 'ACC_X03', 8400000, 'RTGS', 'RTGS2024X002', 'completed', now() - interval '2 days' - interval '8 hours'),
('TXN_X003', 'ACC_X03', 'ACC_X04', 8300000, 'RTGS', 'RTGS2024X003', 'completed', now() - interval '2 days' - interval '6 hours'),
('TXN_X004', 'ACC_X04', 'ACC_X05', 8200000, 'RTGS', 'RTGS2024X004', 'completed', now() - interval '2 days' - interval '4 hours'),
('TXN_X005', 'ACC_X05', 'ACC_X06', 8100000, 'RTGS', 'RTGS2024X005', 'completed', now() - interval '2 days' - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Seed graph_edges (derived from transactions)
INSERT INTO graph_edges (id, source_account_id, target_account_id, total_amount, transaction_count, last_transaction_at, is_suspicious) VALUES
('EDGE_N01_N02', 'ACC_N01', 'ACC_N02', 45000, 1, now() - interval '5 days', false),
('EDGE_N03_N04', 'ACC_N03', 'ACC_N04', 120000, 1, now() - interval '4 days', false),
('EDGE_N05_N06', 'ACC_N05', 'ACC_N06', 8500, 1, now() - interval '4 days', false),
('EDGE_N07_N08', 'ACC_N07', 'ACC_N08', 25000, 1, now() - interval '3 days', false),
('EDGE_N09_N10', 'ACC_N09', 'ACC_N10', 500000, 1, now() - interval '3 days', false),
('EDGE_A01_A02', 'ACC_A01', 'ACC_A02', 7700000, 2, now() - interval '20 minutes', true),
('EDGE_A02_A03', 'ACC_A02', 'ACC_A03', 6950000, 2, now() - interval '2 days', true),
('EDGE_A03_A04', 'ACC_A03', 'ACC_A04', 4100000, 1, now() - interval '2 days', true),
('EDGE_A04_A05', 'ACC_A04', 'ACC_A05', 4050000, 1, now() - interval '2 days', true),
('EDGE_A05_A06', 'ACC_A05', 'ACC_A06', 6700000, 2, now() - interval '2 days', true),
('EDGE_A03_A05', 'ACC_A03', 'ACC_A05', 2750000, 1, now() - interval '5 days', true),
('EDGE_B01_B02', 'ACC_B01', 'ACC_B02', 1850000, 1, now() - interval '1 day', true),
('EDGE_B02_B03', 'ACC_B02', 'ACC_B03', 1800000, 1, now() - interval '1 day', true),
('EDGE_B03_B04', 'ACC_B03', 'ACC_B04', 2670000, 2, now() - interval '1 day', true),
('EDGE_B04_B01', 'ACC_B04', 'ACC_B01', 2580000, 2, now() - interval '1 day', true),
('EDGE_B01_B03', 'ACC_B01', 'ACC_B03', 950000, 1, now() - interval '4 days', true),
('EDGE_B03_B02', 'ACC_B03', 'ACC_B02', 920000, 1, now() - interval '4 days', true),
('EDGE_B02_B04', 'ACC_B02', 'ACC_B04', 900000, 1, now() - interval '4 days', true),
('EDGE_C01_C02', 'ACC_C01', 'ACC_C02', 1970000, 2, now() - interval '3 days', true),
('EDGE_C01_C03', 'ACC_C01', 'ACC_C03', 1935000, 2, now() - interval '3 days', true),
('EDGE_C01_C04', 'ACC_C01', 'ACC_C04', 1963000, 2, now() - interval '3 days', true),
('EDGE_C01_C05', 'ACC_C01', 'ACC_C05', 1958000, 2, now() - interval '3 days', true),
('EDGE_C02_N01', 'ACC_C02', 'ACC_N01', 500000, 1, now() - interval '2 days', false),
('EDGE_C03_N05', 'ACC_C03', 'ACC_N05', 600000, 1, now() - interval '1 day', false),
('EDGE_D01_D02', 'ACC_D01', 'ACC_D02', 7500000, 1, now() - interval '2 hours', true),
('EDGE_D02_D03', 'ACC_D02', 'ACC_D03', 7200000, 1, now() - interval '1 hour', true),
('EDGE_D03_A06', 'ACC_D03', 'ACC_A06', 7000000, 1, now() - interval '30 minutes', true),
('EDGE_E02_E01', 'ACC_E02', 'ACC_E01', 8700000, 2, now() - interval '7 days', true),
('EDGE_E03_E01', 'ACC_E03', 'ACC_E01', 8400000, 2, now() - interval '2 days', true),
('EDGE_E04_E01', 'ACC_E04', 'ACC_E01', 4500000, 1, now() - interval '18 days', true),
('EDGE_E01_E02', 'ACC_E01', 'ACC_E02', 5600000, 1, now() - interval '4 days', true),
('EDGE_E01_E03', 'ACC_E01', 'ACC_E03', 6800000, 1, now() - interval '15 days', true),
('EDGE_E01_E04', 'ACC_E01', 'ACC_E04', 7200000, 1, now() - interval '10 days', true),
('EDGE_M01_N01', 'ACC_M01', 'ACC_N01', 15000, 1, now() - interval '3 days', false),
('EDGE_M03_N03', 'ACC_M03', 'ACC_N03', 85000, 1, now() - interval '5 days', false),
('EDGE_N01_N03', 'ACC_N01', 'ACC_N03', 180000, 1, now() - interval '30 minutes', false),
-- Fan-Out / Fan-In Edges
('EDGE_F01_F02', 'ACC_F01', 'ACC_F02', 1500000, 1, now() - interval '1 day', true),
('EDGE_F01_F03', 'ACC_F01', 'ACC_F03', 1600000, 1, now() - interval '1 day', true),
('EDGE_F01_F04', 'ACC_F01', 'ACC_F04', 1400000, 1, now() - interval '1 day', true),
('EDGE_F01_F05', 'ACC_F01', 'ACC_F05', 1700000, 1, now() - interval '1 day', true),
('EDGE_F01_F06', 'ACC_F01', 'ACC_F06', 1550000, 1, now() - interval '1 day', true),
('EDGE_F01_F07', 'ACC_F01', 'ACC_F07', 1650000, 1, now() - interval '1 day', true),
('EDGE_F02_F08', 'ACC_F02', 'ACC_F08', 1480000, 1, now() - interval '1 day', true),
('EDGE_F03_F08', 'ACC_F03', 'ACC_F08', 1580000, 1, now() - interval '1 day', true),
('EDGE_F04_F08', 'ACC_F04', 'ACC_F08', 1380000, 1, now() - interval '1 day', true),
('EDGE_F05_F08', 'ACC_F05', 'ACC_F08', 1680000, 1, now() - interval '1 day', true),
('EDGE_F06_F08', 'ACC_F06', 'ACC_F08', 1530000, 1, now() - interval '1 day', true),
('EDGE_F07_F08', 'ACC_F07', 'ACC_F08', 1630000, 1, now() - interval '1 day', true),
-- Velocity Spike Edges
('EDGE_V01_N21', 'ACC_V01', 'ACC_N21', 150000, 1, now() - interval '10 hours', true),
-- Cross-Border Layering Edges
('EDGE_X01_X02', 'ACC_X01', 'ACC_X02', 8500000, 1, now() - interval '2 days', true),
('EDGE_X02_X03', 'ACC_X02', 'ACC_X03', 8400000, 1, now() - interval '2 days', true),
('EDGE_X03_X04', 'ACC_X03', 'ACC_X04', 8300000, 1, now() - interval '2 days', true),
('EDGE_X04_X05', 'ACC_X04', 'ACC_X05', 8200000, 1, now() - interval '2 days', true),
('EDGE_X05_X06', 'ACC_X05', 'ACC_X06', 8100000, 1, now() - interval '2 days', true)
ON CONFLICT (id) DO NOTHING;

-- Seed fraud_alerts
INSERT INTO fraud_alerts (id, pattern_type, involved_accounts, linked_transaction_ids, total_amount, confidence_score, shap_narrative, shap_factors, severity, status, assigned_investigator, created_at) VALUES
(
  'ALT_ML001',
  'multi_hop_layering',
  ARRAY['ACC_A01','ACC_A02','ACC_A03','ACC_A04','ACC_A05','ACC_A06'],
  ARRAY['TXN_A001','TXN_A002','TXN_A003','TXN_A004','TXN_A005'],
  4000000,
  0.94,
  'A fund flow chain of 5 hops was detected originating from ACC_A01 (Prakash Dubey, Mumbai Fort) and terminating at ACC_A06 (Final Recipient Shell, Mumbai Lower Parel) within 8 hours. The primary driver is the rapid sequential transfer pattern: each intermediate entity retained funds for less than 2 hours before forwarding 97–99% of the received amount. ACC_A05 and ACC_A06 are newly registered entities (< 6 months) with no prior transaction history before this event, strongly indicating purpose-created shell accounts. The total value of ₹4,00,00,000 exceeds the originator''s declared business income by 4x. SHAP analysis assigns 38% weight to hop velocity, 29% to shell account age, 18% to amount funnel ratio, and 15% to geographic clustering in the Mumbai financial district.',
  '[{"factor": "Hop velocity < 2 hours", "weight": 0.38, "direction": "increases_risk"}, {"factor": "Shell account age < 6 months", "weight": 0.29, "direction": "increases_risk"}, {"factor": "Amount funnel ratio 97-99%", "weight": 0.18, "direction": "increases_risk"}, {"factor": "Geographic clustering (Mumbai)", "weight": 0.15, "direction": "increases_risk"}]',
  'critical',
  'open',
  'Investigator Arjun Mehta',
  now() - interval '2 days'
),
(
  'ALT_CR001',
  'circular_round_trip',
  ARRAY['ACC_B01','ACC_B02','ACC_B03','ACC_B04'],
  ARRAY['TXN_B001','TXN_B002','TXN_B003','TXN_B004'],
  1700000,
  0.91,
  'A closed-loop fund circulation was detected among 4 entities — Kiran Enterprises (B01), Phoenix Distributors (B02), Metro Logistics (B03), and Capital Bridge Finance (B04) — completing a full cycle in 9 hours. Funds originated from ACC_B01 with ₹1,85,00,000 and returned to the same account as ₹1,70,00,000 (92% recovery ratio), indicating the primary purpose was not economic exchange but account balance manipulation. Each intermediate entity has prior business relationships documented, however the transaction pattern deviates significantly from their historical average transaction sizes (this round is 12x their median). SHAP factors: cycle completion (45%), amount recovery ratio 92% (28%), deviation from historical median (27%).',
  '[{"factor": "Closed cycle completion detected", "weight": 0.45, "direction": "increases_risk"}, {"factor": "Amount recovery ratio 92%", "weight": 0.28, "direction": "increases_risk"}, {"factor": "Transaction size 12x historical median", "weight": 0.27, "direction": "increases_risk"}]',
  'critical',
  'open',
  'Investigator Priya Sharma',
  now() - interval '1 day'
),
(
  'ALT_ST001',
  'structuring',
  ARRAY['ACC_C01','ACC_C02','ACC_C03','ACC_C04','ACC_C05'],
  ARRAY['TXN_C001','TXN_C002','TXN_C003','TXN_C004','TXN_C005','TXN_C006','TXN_C007','TXN_C008'],
  7826000,
  0.89,
  'ACC_C01 (Ramesh Narayan Patil, Pune Deccan) executed 8 transactions over 72 hours, each precisely between ₹9,60,000 and ₹9,90,000 — all below the ₹10,00,000 mandatory reporting threshold. The aggregate value of ₹78,26,000 would trigger both STR and CTR obligations if transacted as a single transfer. The four recipient accounts (C02–C05) are registered businesses in the same geographic cluster (Pune), and all received funds have been partially forwarded to clean accounts within 24 hours. This pattern matches known smurfing behaviour with 89% model confidence. Key SHAP drivers: sub-threshold amount clustering (52%), high transaction frequency in 72-hour window (31%), recipient account forwarding behaviour (17%).',
  '[{"factor": "Sub-threshold amount clustering ₹9.6L-₹9.9L", "weight": 0.52, "direction": "increases_risk"}, {"factor": "8 transactions in 72-hour window", "weight": 0.31, "direction": "increases_risk"}, {"factor": "Recipient accounts forward funds within 24h", "weight": 0.17, "direction": "increases_risk"}]',
  'high',
  'open',
  'Investigator Kavitha Nair',
  now() - interval '3 days'
),
(
  'ALT_DR001',
  'dormant_reactivation',
  ARRAY['ACC_D01','ACC_D02','ACC_D03'],
  ARRAY['TXN_D001','TXN_D002','TXN_D003'],
  7500000,
  0.87,
  'ACC_D01 (Sudhir Malhotra, Kolkata Salt Lake) was dormant for 8 months and 12 days with zero transaction activity. Within 2 hours of reactivation, the account initiated a ₹7,50,00,000 RTGS transfer to Eastern Traders Consortium (ACC_D02), which immediately forwarded ₹7,20,00,000 to Howrah Bridge Investments (ACC_D03). The account holder is a retired individual (declared income: ₹3,00,000/year), making this single transfer 250x the declared annual income. The rapid reactivation-and-forward pattern is strongly consistent with the account being used as a pass-through for third-party funds. SHAP analysis: dormancy duration 8 months (41%), transfer amount vs declared income ratio 250x (35%), immediate forwarding chain (24%).',
  '[{"factor": "Dormancy duration 8 months 12 days", "weight": 0.41, "direction": "increases_risk"}, {"factor": "Transfer 250x declared annual income", "weight": 0.35, "direction": "increases_risk"}, {"factor": "Immediate forwarding within 1 hour", "weight": 0.24, "direction": "increases_risk"}]',
  'critical',
  'open',
  'Investigator Arjun Mehta',
  now() - interval '2 hours'
),
(
  'ALT_KM001',
  'kyc_mismatch',
  ARRAY['ACC_E01','ACC_E02','ACC_E03','ACC_E04'],
  ARRAY['TXN_E001','TXN_E002','TXN_E003','TXN_E004','TXN_E005','TXN_E006','TXN_E007','TXN_E008'],
  45200000,
  0.96,
  'ACC_E01 (Raju Prasad Yadav, Patna Boring Road) is classified as a daily wage worker with a declared annual income of ₹1,20,000. Over the past 30 days, total credit transactions to this account sum to ₹4,52,00,000 — a ratio of 377x the declared annual income. The transaction counter-parties (ACC_E02, E03, E04) are registered businesses with substantially higher declared incomes, suggesting the individual account is being used as a conduit. The account has no prior history of business transactions in its 2-year lifetime. SHAP breakdown: credit volume vs declared income 377x (58%), account profile mismatch with counter-party business entities (24%), sudden change in transaction pattern from retail to bulk (18%).',
  '[{"factor": "Credit volume 377x declared annual income", "weight": 0.58, "direction": "increases_risk"}, {"factor": "Account type mismatch with counter-parties", "weight": 0.24, "direction": "increases_risk"}, {"factor": "Sudden shift from retail to bulk transactions", "weight": 0.18, "direction": "increases_risk"}]',
  'critical',
  'open',
  'Investigator Priya Sharma',
  now() - interval '1 day'
),
(
  'ALT_ML002',
  'multi_hop_layering',
  ARRAY['ACC_A01','ACC_A03','ACC_A05','ACC_A06'],
  ARRAY['TXN_A006','TXN_A007','TXN_A008'],
  2700000,
  0.82,
  'A secondary 3-hop layering chain from ACC_A01 through ACC_A03 and ACC_A05 to ACC_A06 was detected, occurring 3 days prior to the primary 5-hop chain. This suggests a test run of the layering network before the larger ₹4Cr movement. The 3 hops each completed within 3-hour intervals, and the final destination (ACC_A06) is the same shell entity as in ALT_ML001. The recurrence of ACC_A06 as a terminal destination across multiple independent chains strongly indicates it as a primary beneficiary account. SHAP drivers: repeated terminal account (44%), sub-3-hour hop velocity (33%), cross-chain linkage with ALT_ML001 (23%).',
  '[{"factor": "ACC_A06 repeated terminal destination", "weight": 0.44, "direction": "increases_risk"}, {"factor": "Sub 3-hour hop velocity", "weight": 0.33, "direction": "increases_risk"}, {"factor": "Cross-chain linkage with primary layering alert", "weight": 0.23, "direction": "increases_risk"}]',
  'high',
  'confirmed',
  'Investigator Arjun Mehta',
  now() - interval '5 days'
),
(
  'ALT_CR002',
  'circular_round_trip',
  ARRAY['ACC_B01','ACC_B03','ACC_B02','ACC_B04'],
  ARRAY['TXN_B005','TXN_B006','TXN_B007','TXN_B008'],
  880000,
  0.78,
  'A second circular round-trip pattern between the same 4 entities (B01–B04) was identified 4 days before the primary round-trip. The smaller transaction size (₹9.5L origin, ₹8.8L returned — 92.6% recovery) and the same set of accounts confirm a recurring money circulation operation. The consistency of the 92% recovery ratio across both rounds suggests a systematic fee arrangement for the circulation service. SHAP: same entity set as prior alert (48%), consistent 92% recovery ratio (32%), NEFT channel vs RTGS in primary alert (20%).',
  '[{"factor": "Same entity set as ALT_CR001", "weight": 0.48, "direction": "increases_risk"}, {"factor": "Consistent 92.6% amount recovery ratio", "weight": 0.32, "direction": "increases_risk"}, {"factor": "Pattern repetition across multiple days", "weight": 0.20, "direction": "increases_risk"}]',
  'high',
  'dismissed',
  'Investigator Kavitha Nair',
  now() - interval '4 days'
),
(
  'ALT_FOFI001',
  'fan_out_fan_in',
  ARRAY['ACC_F01','ACC_F02','ACC_F03','ACC_F04','ACC_F05','ACC_F06','ACC_F07','ACC_F08'],
  ARRAY['TXN_F001','TXN_F002','TXN_F003','TXN_F004','TXN_F005','TXN_F006','TXN_F007','TXN_F008','TXN_F009','TXN_F010','TXN_F011','TXN_F012'],
  9400000,
  0.92,
  'A classic fan-out/fan-in consolidation pattern was detected. Primary hub ACC_F01 (Vikram Enterprises Hub, Mumbai Main) distributed ₹9.4Cr in aggregate to 6 recipient accounts (F02-F07) within 2 hours. Within 2 hours of receiving, these 6 accounts forwarded 98-99% of their balances to the consolidation hub ACC_F08 (Consolidated Aggregations, Mumbai Main), effectively laundering the entire amount through distinct pipelines. This mirrors structural smurfing at scale. Integrated Gradients attribution assigns high importance to fan-out ratio, transaction velocity, and terminal consolidation aggregation.',
  '[{"factor": "6-channel parallel fan-out distribution", "weight": 0.42, "direction": "increases_risk"}, {"factor": "98% consolidated aggregation to F08", "weight": 0.35, "direction": "increases_risk"}, {"factor": "Immediate sub-2 hour forwarding velocity", "weight": 0.23, "direction": "increases_risk"}]',
  'critical',
  'open',
  'Investigator Arjun Mehta',
  now() - interval '1 day'
),
(
  'ALT_VEL001',
  'velocity_spike',
  ARRAY['ACC_V01'],
  ARRAY['TXN_V001','TXN_V002','TXN_V003','TXN_V004','TXN_V005','TXN_V006','TXN_V007','TXN_V008','TXN_V009','TXN_V010','TXN_V011','TXN_V012'],
  1750000,
  0.86,
  'An extraordinary transaction velocity spike was identified on ACC_V01 (Anand Sharma Rapid, Delhi Central). The account suddenly executed 12 separate outgoing UPI transactions within a rapid 6-hour window, totaling ₹17.5 Lakhs. This represents a 4.5x increase in daily transaction frequency compared to its rolling 30-day baseline. This rapid sequence behavior is common in cash-out operations or automated mule activity. Key attribution: outgoing frequency spike (55%), multi-recipient distribution (28%), UPI channel execution (17%).',
  '[{"factor": "12 transactions within 6 hours", "weight": 0.55, "direction": "increases_risk"}, {"factor": "4.5x surge over historical velocity baseline", "weight": 0.28, "direction": "increases_risk"}, {"factor": "Exclusive UPI channel execution", "weight": 0.17, "direction": "increases_risk"}]',
  'high',
  'open',
  'Investigator Priya Sharma',
  now() - interval '10 hours'
),
(
  'ALT_CBL001',
  'cross_border_layering',
  ARRAY['ACC_X01','ACC_X02','ACC_X03','ACC_X04','ACC_X05','ACC_X06'],
  ARRAY['TXN_X001','TXN_X002','TXN_X003','TXN_X004','TXN_X005'],
  8500000,
  0.95,
  'A highly sophisticated multi-branch cross-border layering chain of 5 hops was detected. Funds of ₹8.5Cr originated from Delhi Central (ACC_X01) and routed successively through Mumbai Main (ACC_X02), Kolkata Park Street (ACC_X03), Chennai T Nagar (ACC_X04), Bangalore Koramangala (ACC_X05), and finally settled in Hyderabad Jubilee Hills (ACC_X06) — all within 10 hours. Spanning 6 distinct city branches across the country indicates a deliberate attempt to evade regional audit controls and exploit inter-state clearing latency. SHAP / IG analysis confirms regional branch dispersion (45%), hop sequence completion (35%), and transaction size consistency (20%) as major suspicious drivers.',
  '[{"factor": "6 distinct city-branch dispersion", "weight": 0.45, "direction": "increases_risk"}, {"factor": "5-hop linear routing completed in 10h", "weight": 0.35, "direction": "increases_risk"}, {"factor": "98.5% value retention across hops", "weight": 0.20, "direction": "increases_risk"}]',
  'critical',
  'open',
  'Investigator Priya Sharma',
  now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- Seed investigator_feedback
INSERT INTO investigator_feedback (id, alert_id, investigator_action, investigator_name, notes, created_at) VALUES
('FB_001', 'ALT_ML002', 'confirmed', 'Investigator Arjun Mehta', 'Verified shell account registrations with ROC data. ACC_A05 and ACC_A06 registered same week. Escalating to STR.', now() - interval '4 days'),
('FB_002', 'ALT_CR002', 'dismissed', 'Investigator Kavitha Nair', 'After checking with branch relationship manager, these four entities have legitimate inter-company settlement agreements. Pattern explained by monthly reconciliation cycle.', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- Seed str_ctr_reports
INSERT INTO str_ctr_reports (id, alert_ids, report_type, narrative, subject_details, transaction_summary, generation_time_seconds, submission_status, created_at) VALUES
(
  'RPT_001',
  ARRAY['ALT_ML002'],
  'STR',
  'Suspicious Transaction Report: Multi-hop layering network involving 4 entities across Mumbai financial district. Funds of ₹2,70,00,000 traced through a 3-hop chain from ACC_A01 to shell entity ACC_A06 within a 9-hour window. Shell company registration patterns and fund velocity are consistent with trade-based money laundering indicators. Recommending enhanced due diligence and account freeze pending investigation.',
  '{"reporting_entity": "Union Bank of India", "branch": "Mumbai Fort", "officer": "Chief Compliance Officer", "date": "2024-04-29"}',
  '{"total_amount": 2700000, "transaction_count": 3, "channels": ["RTGS"], "time_span_hours": 9}',
  487,
  'submitted',
  now() - interval '4 days'
)
ON CONFLICT (id) DO NOTHING;

-- Seed federated_nodes (26 public sector banks)
INSERT INTO federated_nodes (id, bank_name, bank_code, status, last_sync_at, alerts_contributed, model_version, precision_score, recall_score, f1_score) VALUES
('FED_SBI', 'State Bank of India', 'SBIN', 'active', now() - interval '2 hours', 342, 'v2.3.1', 0.91, 0.88, 0.895),
('FED_PNB', 'Punjab National Bank', 'PUNB', 'active', now() - interval '3 hours', 187, 'v2.3.1', 0.89, 0.86, 0.875),
('FED_BOB', 'Bank of Baroda', 'BARB', 'active', now() - interval '4 hours', 156, 'v2.3.0', 0.88, 0.85, 0.865),
('FED_CBI', 'Central Bank of India', 'CBIN', 'active', now() - interval '5 hours', 98, 'v2.3.0', 0.87, 0.84, 0.855),
('FED_UCO', 'UCO Bank', 'UCBA', 'active', now() - interval '6 hours', 72, 'v2.2.1', 0.86, 0.83, 0.845),
('FED_BOI', 'Bank of India', 'BKID', 'active', now() - interval '7 hours', 134, 'v2.3.1', 0.90, 0.87, 0.885),
('FED_CAN', 'Canara Bank', 'CNRB', 'active', now() - interval '8 hours', 201, 'v2.3.1', 0.91, 0.88, 0.895),
('FED_UNI', 'Union Bank of India', 'UBIN', 'active', now() - interval '1 hour', 278, 'v2.3.2', 0.93, 0.91, 0.920),
('FED_IOB', 'Indian Overseas Bank', 'IOBA', 'active', now() - interval '9 hours', 89, 'v2.2.1', 0.85, 0.82, 0.835),
('FED_IDB', 'IDBI Bank', 'IBKL', 'active', now() - interval '10 hours', 112, 'v2.3.0', 0.88, 0.85, 0.865),
('FED_AND', 'Andhra Bank', 'ANDB', 'syncing', now() - interval '12 hours', 67, 'v2.2.0', 0.84, 0.81, 0.825),
('FED_INB', 'Indian Bank', 'IDIB', 'active', now() - interval '11 hours', 93, 'v2.2.1', 0.86, 0.83, 0.845),
('FED_VIJ', 'Vijaya Bank', 'VIJB', 'active', now() - interval '13 hours', 54, 'v2.2.0', 0.83, 0.80, 0.815),
('FED_SYN', 'Syndicate Bank', 'SYNB', 'active', now() - interval '14 hours', 78, 'v2.2.1', 0.85, 0.82, 0.835),
('FED_ALL', 'Allahabad Bank', 'ALLA', 'active', now() - interval '15 hours', 61, 'v2.2.0', 0.84, 0.81, 0.825),
('FED_OBC', 'Oriental Bank of Commerce', 'ORBC', 'syncing', now() - interval '18 hours', 45, 'v2.1.0', 0.82, 0.79, 0.805),
('FED_UBI', 'United Bank of India', 'UTBI', 'active', now() - interval '16 hours', 58, 'v2.2.0', 0.83, 0.80, 0.815),
('FED_COR', 'Corporation Bank', 'CORP', 'active', now() - interval '17 hours', 43, 'v2.1.0', 0.82, 0.79, 0.805),
('FED_DEN', 'Dena Bank', 'BKDN', 'offline', now() - interval '2 days', 29, 'v2.0.0', 0.79, 0.76, 0.775),
('FED_VIB', 'Vijaya Bank Merged', 'VIJM', 'active', now() - interval '19 hours', 38, 'v2.1.0', 0.81, 0.78, 0.795),
('FED_PBT', 'Punjab & Sind Bank', 'PSIB', 'active', now() - interval '20 hours', 47, 'v2.2.0', 0.83, 0.80, 0.815),
('FED_MAH', 'Bank of Maharashtra', 'MAHB', 'active', now() - interval '21 hours', 82, 'v2.2.1', 0.85, 0.82, 0.835),
('FED_KGB', 'Karnataka Bank', 'KARB', 'active', now() - interval '22 hours', 56, 'v2.2.0', 0.83, 0.80, 0.815),
('FED_JAK', 'J&K Bank', 'JAKA', 'syncing', now() - interval '1 day', 34, 'v2.1.0', 0.81, 0.78, 0.795),
('FED_SIT', 'South Indian Bank', 'SIBL', 'active', now() - interval '23 hours', 41, 'v2.1.0', 0.82, 0.79, 0.805),
('FED_KVB', 'Karur Vysya Bank', 'KVBL', 'active', now() - interval '20 hours', 35, 'v2.1.0', 0.81, 0.78, 0.795)
ON CONFLICT (id) DO NOTHING;
