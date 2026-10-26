-- ==============================================================================
-- ParkMate Supabase Seed Data Migration
-- Adds default verified hosts, spaces, availability rules, and demo seed data
-- ==============================================================================

DO $$
DECLARE
  v_host_marcus UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  v_host_elena UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  v_host_sarah UUID := '00000000-0000-0000-0000-000000000003'::uuid;
  v_driver_alex UUID := '00000000-0000-0000-0000-000000000004'::uuid;

  v_space_101 UUID := 'a0000000-0000-0000-0000-000000000101'::uuid;
  v_space_102 UUID := 'a0000000-0000-0000-0000-000000000102'::uuid;
  v_space_103 UUID := 'a0000000-0000-0000-0000-000000000103'::uuid;
  v_space_104 UUID := 'a0000000-0000-0000-0000-000000000104'::uuid;
  v_space_105 UUID := 'a0000000-0000-0000-0000-000000000105'::uuid;
  v_space_106 UUID := 'a0000000-0000-0000-0000-000000000106'::uuid;
BEGIN
  -- Insert demo profiles if not existing
  INSERT INTO public.profiles (id, display_name, email, phone, avatar_url, role, is_superhost, response_time)
  VALUES 
    (v_host_marcus, 'Marcus Vance', 'marcus@example.com', '+1 (415) 555-0192', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', 'owner', true, 'under 10 mins'),
    (v_host_elena, 'Elena Rostova', 'elena@example.com', '+1 (415) 555-0144', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', 'owner', true, 'within 5 mins'),
    (v_host_sarah, 'Sarah Jenkins', 'sarah@example.com', '+1 (415) 555-0177', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 'owner', false, 'within 30 mins'),
    (v_driver_alex, 'Alex Mercer', 'alex.mercer@example.com', '+1 (415) 555-0188', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80', 'both', true, 'under 5 mins')
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role;

  -- Insert spaces
  INSERT INTO public.parking_spaces (
    id, owner_id, title, description, address, neighborhood, city,
    latitude, longitude, price_per_hour, price_per_day, category,
    photos, rating, review_count, is_covered, has_ev_charging, ev_charger_type,
    verification_status, publication_status, is_demo_seed, walking_distance,
    max_vehicle_type, clearance_feet, access_type, access_instructions,
    security_features, rules, recovery_guaranteed, flexible_extension_supported, available_slots_count
  ) VALUES 
  (
    v_space_101, v_host_marcus,
    'Secure Downtown Underground Garage - Bay A12',
    'Centrally located underground parking space with high-speed 24/7 automated barrier access. Heated in winter, protected from weather, and equipped with comprehensive CCTV coverage.',
    '245 Market St, Financial District', 'Financial District', 'San Francisco',
    37.7915, -122.3995, 7.50, 42.00, 'covered',
    ARRAY[
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80'
    ],
    4.95, 128, true, true, 'Level 2 (J1772 - 7.6kW)',
    'verified', 'published', true, '2 min walk to Montgomery BART',
    'suv', 7.20, 'qr_scanner',
    'Scan ParkMate pass QR code at entry scanner on the driver side pillar. Gate opens automatically.',
    ARRAY['24/7 CCTV Monitoring', 'Security Guard On Duty', 'Motorized Roller Gate', 'Bright LED Lighting'],
    ARRAY['No overnight idling', 'Head-in parking only', 'Display digital ParkMate pass'],
    true, true, 3
  ),
  (
    v_space_102, v_host_elena,
    'Private Residential Paved Driveway with Tesla Wall Connector',
    'Spacious private residential driveway in a quiet, safe tree-lined neighborhood. Direct street access with no tight turns or curbs to curb your rims. Dedicated Tesla Gen 3 Wall connector included.',
    '712 Pine Ave, Nob Hill', 'Nob Hill', 'San Francisco',
    37.7910, -122.4110, 5.00, 28.00, 'ev_charging',
    ARRAY[
      'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80'
    ],
    4.88, 64, false, true, 'Tesla Wall Connector (11.5 kW)',
    'verified', 'published', true, '5 min walk to Grace Cathedral & Cable Car',
    'truck', 12.00, 'instant_keypad',
    'Park right in the marked left bay. Plug charger directly; electricity included in reservation rate.',
    ARRAY['Ring Floodlight Cam', 'Neighborhood Watch Active', 'Direct Street View'],
    ARRAY['Respect quiet hours 10 PM - 7 AM', 'Keep charging cable tidy'],
    true, true, 1
  ),
  (
    v_space_103, v_host_sarah,
    'Convention Center Plaza - Gated Executive Level',
    'Upper executive deck parking right across the street from Moscone Convention Center. Oversized spaces suitable for full-size pickups, SUVs, and commercial vans.',
    '780 Howard St, SoMa', 'SoMa', 'San Francisco',
    37.7842, -122.4015, 9.00, 55.00, 'event',
    ARRAY[
      'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80'
    ],
    4.91, 210, true, false, null,
    'verified', 'published', true, '1 min walk across to Moscone South Entrance',
    'truck', 8.50, 'app_remote',
    'Open the ParkMate app when within 50 feet of the perimeter gate and tap Open Gate.',
    ARRAY['Keycard-Only Pedestrian Doors', 'CCTV 360 Degree Coverage', 'Automated Barrier'],
    ARRAY['No commercial washing on premise', 'Speed limit 5 MPH strictly observed'],
    true, true, 5
  ),
  (
    v_space_104, v_host_marcus,
    'SFO Long-Term Park & Fly Carport with Free Terminal Shuttle',
    'Reserved covered carport spot with continuous round-the-clock complimentary luxury shuttle to SFO terminals 1, 2, 3 and International.',
    '1120 Old Bayshore Hwy, Burlingame', 'Airport', 'San Francisco',
    37.6012, -122.3654, 3.50, 22.00, 'airport',
    ARRAY[
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80'
    ],
    4.79, 340, true, true, 'Level 2 EV',
    'verified', 'published', true, 'Free 6-minute dedicated shuttle departure every 10 min',
    'van', 7.80, 'on_site_attendant',
    'Pull into Lane 1. Uniformed valet attendant will scan your ParkMate reservation and hand you shuttle boarding card.',
    ARRAY['Perimeter Razor Fence', 'K-9 Patrol at Night', '24/7 Attendants'],
    ARRAY['Leave keys with attendant only if dual-stacked', 'Arrive 20 mins prior to shuttle needs'],
    true, true, 12
  ),
  (
    v_space_105, v_host_elena,
    'Valencia Corridor Dedicated Carport - Wide Access',
    'Clean, off-street dedicated parking spot right behind historic Victorian building on Valencia. Ultra convenient for Mission restaurants, concert venues, and nightlife.',
    '852 Valencia St, Mission District', 'Mission', 'San Francisco',
    37.7592, -122.4215, 6.00, 35.00, 'daily',
    ARRAY[
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80'
    ],
    4.84, 89, true, false, null,
    'verified', 'published', true, 'Immediate access to Valencia dining row',
    'suv', 7.00, 'instant_keypad',
    'Enter gate code #4492 on keypad next to alley gate. Spot #2 is clearly painted on asphalt.',
    ARRAY['Well-lit Alley', 'CCTV Camera Pointed at Bays', 'Locked Pedestrian Gate'],
    ARRAY['Must park between painted yellow lines', 'No loud music after 9 PM'],
    true, true, 2
  ),
  (
    v_space_106, v_host_sarah,
    'Mission Bay Medical & Chase Center Gated Deck',
    'Brand new pristine parking deck spot 2 blocks from Chase Center arena and UCSF Medical Center campus. Smooth epoxy floors with ultra wide spots.',
    '450 16th St, Mission Bay', 'SoMa', 'San Francisco',
    37.7668, -122.3920, 8.50, 48.00, 'event',
    ARRAY[
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80'
    ],
    4.97, 156, true, true, 'ChargePoint Level 2 (6.6 kW)',
    'verified', 'published', true, '4 min walk to Chase Center North Entrance',
    'sedan', 6.80, 'qr_scanner',
    'Hold ParkMate QR pass up to glass reader at barrier. Park in Level 2 Green Section.',
    ARRAY['License Plate Recognition Camera', '24/7 Security Patrol', 'Emergency Call Boxes'],
    ARRAY['Maximum speed 10 MPH', 'EV charging capped at 4 consecutive hours'],
    true, true, 4
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price_per_hour = EXCLUDED.price_per_hour,
    price_per_day = EXCLUDED.price_per_day,
    photos = EXCLUDED.photos;

  -- Insert weekly availability rules for each space
  INSERT INTO public.availability_rules (space_id, day_of_week, start_time, end_time, is_blocked)
  SELECT s.id, d.day, '00:00:00'::time, '23:59:59'::time, false
  FROM public.parking_spaces s
  CROSS JOIN (SELECT generate_series(0, 6) AS day) d
  ON CONFLICT DO NOTHING;

END $$;
