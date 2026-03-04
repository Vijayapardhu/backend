import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/utils/hash.util";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Create admin user
  const adminPassword = await hashPassword("Admin@123");
  const admin = await prisma.user.upsert({
    where: { email: "admin@hosthaven.com" },
    update: {
      passwordHash: adminPassword,
      role: "ADMIN",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "admin@hosthaven.com",
      name: "Admin User",
      passwordHash: adminPassword,
      role: "ADMIN",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // Create real admin user
  const realAdminPassword = await hashPassword("HostHaven@Admin");
  const realAdmin = await prisma.user.upsert({
    where: { email: "clpprincess29@gmail.com" },
    update: {
      passwordHash: realAdminPassword,
      role: "ADMIN",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "clpprincess29@gmail.com",
      name: "Super Admin",
      passwordHash: realAdminPassword,
      role: "ADMIN",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log("✅ Real Admin user created:", realAdmin.email);

  // Create test user
  const userPassword = await hashPassword("User@123");
  const user = await prisma.user.upsert({
    where: { email: "user@hosthaven.com" },
    update: {
      passwordHash: userPassword,
      role: "USER",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "user@hosthaven.com",
      name: "Test User",
      passwordHash: userPassword,
      role: "USER",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log("✅ Test user created:", user.email);

  // Create vendor user
  const vendorPassword = await hashPassword("Vendor@123");
  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor@hosthaven.com" },
    update: {
      passwordHash: vendorPassword,
      role: "VENDOR",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "vendor@hosthaven.com",
      name: "Test Vendor",
      passwordHash: vendorPassword,
      role: "VENDOR",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: "Heritage Stays Pvt Ltd",
      businessAddress: "MG Road, Vijayawada, Andhra Pradesh",
      gstNumber: "37AABCU9603R1ZM",
      panNumber: "AABCU9603R",
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log("✅ Vendor created:", vendor.businessName);

  // Create more vendors
  const vendor2Password = await hashPassword("Vendor@123");
  const vendor2User = await prisma.user.upsert({
    where: { email: "temple_stays@example.com" },
    update: { passwordHash: vendor2Password, role: "VENDOR", isVerified: true },
    create: {
      email: "temple_stays@example.com",
      name: "Temple Stays Management",
      passwordHash: vendor2Password,
      role: "VENDOR",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { userId: vendor2User.id },
    update: {},
    create: {
      userId: vendor2User.id,
      businessName: "Temple Stays Management",
      businessAddress: "Tirupati, Chittoor District, Andhra Pradesh - 517501",
      gstNumber: "37AABCU9603R2ZN",
      panNumber: "AABCU9603S",
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log("✅ Vendor created:", vendor2.businessName);

  const vendor3Password = await hashPassword("Vendor@123");
  const vendor3User = await prisma.user.upsert({
    where: { email: "coastal_retreats@example.com" },
    update: { passwordHash: vendor3Password, role: "VENDOR", isVerified: true },
    create: {
      email: "coastal_retreats@example.com",
      name: "Coastal Retreats Pvt Ltd",
      passwordHash: vendor3Password,
      role: "VENDOR",
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const vendor3 = await prisma.vendor.upsert({
    where: { userId: vendor3User.id },
    update: {},
    create: {
      userId: vendor3User.id,
      businessName: "Coastal Retreats Pvt Ltd",
      businessAddress: "Visakhapatnam, Andhra Pradesh - 530001",
      gstNumber: "37AABCU9603R3ZM",
      panNumber: "AABCU9603T",
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log("✅ Vendor created:", vendor3.businessName);

  // Sample properties
  const properties = [
    {
      type: "HOTEL" as const,
      name: "Vijayawada Grand Hotel",
      slug: "vijayawada-grand-hotel",
      description:
        "A luxurious hotel in the heart of Vijayawada with modern amenities and excellent service. Perfect for business and leisure travelers.",
      shortDesc: "Luxury hotel in Vijayawada",
      address: "MG Road, Near Benz Circle",
      city: "VIJAYAWADA",
      state: "Andhra Pradesh",
      pincode: "520010",
      latitude: 16.5062,
      longitude: 80.648,
      images: [
        {
          url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
          alt: "Hotel Exterior",
          isPrimary: true,
        },
        {
          url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800",
          alt: "Hotel Lobby",
          isPrimary: false,
        },
        {
          url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
          alt: "Hotel Room",
          isPrimary: false,
        },
      ],
      amenities: [
        "wifi",
        "parking",
        "pool",
        "gym",
        "restaurant",
        "room-service",
        "ac",
        "tv",
        "laundry",
      ],
      highlights: [
        "Central Location",
        "Free WiFi",
        "Swimming Pool",
        "Multi-cuisine Restaurant",
      ],
      basePrice: 3500,
      currency: "INR",
      rating: 4.5,
      reviewCount: 128,
      status: "ACTIVE" as const,
      isFeatured: true,
      vendorId: vendor.id,
    },
    {
      type: "HOTEL" as const,
      name: "Temple City Residency",
      slug: "temple-city-residency",
      description:
        "Comfortable stay near Tirumala Temple with easy access to spiritual destinations. Ideal for pilgrims visiting Tirumala.",
      shortDesc: "Pilgrim-friendly hotel near Tirumala",
      address: "Tirupati Bazar Road",
      city: "NANDIYALA",
      state: "Andhra Pradesh",
      pincode: "517501",
      latitude: 13.6288,
      longitude: 79.4192,
      images: [
        {
          url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800",
          alt: "Hotel Exterior",
          isPrimary: true,
        },
        {
          url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
          alt: "Hotel Room",
          isPrimary: false,
        },
      ],
      amenities: ["wifi", "parking", "ac", "restaurant", "room-service"],
      highlights: [
        "Near Tirumala Temple",
        "Pilgrim Packages",
        "24/7 Reception",
      ],
      basePrice: 2500,
      currency: "INR",
      rating: 4.2,
      reviewCount: 85,
      status: "ACTIVE" as const,
      isFeatured: true,
      vendorId: vendor.id,
    },
    {
      type: "HOME" as const,
      name: "Krishna Riverside Cottage",
      slug: "krishna-riverside-cottage",
      description:
        "A serene homestay on the banks of Krishna River. Experience authentic Andhra hospitality with home-cooked meals.",
      shortDesc: "Riverside homestay in Vijayawada",
      address: "Kondaveedu Village",
      city: "VIJAYAWADA",
      state: "Andhra Pradesh",
      pincode: "521215",
      latitude: 16.32,
      longitude: 80.55,
      images: [
        {
          url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
          alt: "Cottage Exterior",
          isPrimary: true,
        },
        {
          url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800",
          alt: "Living Room",
          isPrimary: false,
        },
      ],
      amenities: ["wifi", "parking", "kitchen", "ac", "garden"],
      highlights: ["Riverside Location", "Home-cooked Food", "Farm Activities"],
      basePrice: 2800,
      currency: "INR",
      rating: 4.8,
      reviewCount: 42,
      status: "ACTIVE" as const,
      isFeatured: false,
      vendorId: vendor.id,
    },
    {
      type: "TEMPLE" as const,
      name: "Srikalahasti Temple Stay",
      slug: "srikalahasti-temple-stay",
      description:
        "Comfortable accommodation near the famous Srikalahasti Temple. Perfect for devotees seeking spiritual solace.",
      shortDesc: "Temple stay near Srikalahasti",
      address: "Srikalahasti Temple Road",
      city: "VETLAPALEM",
      state: "Andhra Pradesh",
      pincode: "517644",
      latitude: 13.7518,
      longitude: 79.7029,
      images: [
        {
          url: "https://images.unsplash.com/photo-1569429594044-bcc5ad652a65?w=800",
          alt: "Temple View",
          isPrimary: true,
        },
        {
          url: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800",
          alt: "Temple Interior",
          isPrimary: false,
        },
      ],
      amenities: ["wifi", "parking", "ac", "restaurant", "prayer-room"],
      highlights: [
        "Near Temple",
        "Spiritual Environment",
        "Devotional Activities",
      ],
      basePrice: 1800,
      currency: "INR",
      rating: 4.6,
      reviewCount: 156,
      status: "ACTIVE" as const,
      isFeatured: true,
      vendorId: vendor.id,
    },
    {
      type: "TEMPLE" as const,
      name: "Kanaka Durga Temple Complex",
      slug: "kanaka-durga-temple-complex",
      description:
        "Sacred accommodation on Indrakeeladri Hill, home to Kanaka Durga Temple. Experience divine bliss with panoramic views.",
      shortDesc: "Hilltop temple accommodation",
      address: "Indrakeeladri Hill",
      city: "VIJAYAWADA",
      state: "Andhra Pradesh",
      pincode: "520001",
      latitude: 16.5186,
      longitude: 80.6195,
      images: [
        {
          url: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800",
          alt: "Temple View",
          isPrimary: true,
        },
      ],
      amenities: ["wifi", "parking", "ac", "temple-tours"],
      highlights: ["Hilltop Location", "Temple Views", "Morning Pooja"],
      basePrice: 2200,
      currency: "INR",
      rating: 4.9,
      reviewCount: 203,
      status: "ACTIVE" as const,
      isFeatured: true,
      vendorId: vendor.id,
    },
  ];

  for (const propertyData of properties) {
    const property = await prisma.property.upsert({
      where: { slug: propertyData.slug },
      update: {},
      create: propertyData,
    });
    console.log("✅ Property created:", property.name);

    // Create rooms for each property
    const rooms = [
      {
        propertyId: property.id,
        name: "Standard Room",
        description: "Comfortable standard room with all basic amenities",
        type: "standard",
        capacity: 2,
        extraBedCapacity: 1,
        pricePerNight: propertyData.basePrice,
        amenities: ["ac", "tv", "wifi"],
        totalRooms: 10,
        availableRooms: 8,
      },
      {
        propertyId: property.id,
        name: "Deluxe Room",
        description: "Spacious deluxe room with premium amenities",
        type: "deluxe",
        capacity: 3,
        extraBedCapacity: 1,
        pricePerNight: Math.round(propertyData.basePrice * 1.5),
        amenities: ["ac", "tv", "wifi", "mini-bar", "balcony"],
        totalRooms: 5,
        availableRooms: 4,
      },
      {
        propertyId: property.id,
        name: "Suite",
        description: "Luxurious suite with separate living area",
        type: "suite",
        capacity: 4,
        extraBedCapacity: 2,
        pricePerNight: propertyData.basePrice * 2.5,
        amenities: ["ac", "tv", "wifi", "mini-bar", "balcony", "living-room"],
        totalRooms: 2,
        availableRooms: 2,
      },
    ];

    await prisma.room.deleteMany({ where: { propertyId: property.id } });
    await prisma.room.createMany({ data: rooms });
    console.log("  ✅ Rooms created:", rooms.length);

    // Create temple details for temple properties
    if (propertyData.type === "TEMPLE") {
      const templeDetails = await prisma.templeDetails.upsert({
        where: { propertyId: property.id },
        update: {},
        create: {
          propertyId: property.id,
          deity: propertyData.name.includes("Kanaka Durga")
            ? "Kanaka Durga"
            : "Lord Shiva",
          templeType: propertyData.name.includes("Kanaka Durga")
            ? "Durga"
            : "Shiva",
          builtYear: "16th Century",
          architecture: "Dravidian Architecture",
          darshanTimings: [
            { day: "Monday", openTime: "05:00", closeTime: "12:00" },
            { day: "Monday", openTime: "14:00", closeTime: "21:00" },
            { day: "Tuesday", openTime: "05:00", closeTime: "12:00" },
            { day: "Tuesday", openTime: "14:00", closeTime: "21:00" },
            { day: "Wednesday", openTime: "05:00", closeTime: "12:00" },
            { day: "Wednesday", openTime: "14:00", closeTime: "21:00" },
            { day: "Thursday", openTime: "05:00", closeTime: "12:00" },
            { day: "Thursday", openTime: "14:00", closeTime: "21:00" },
            { day: "Friday", openTime: "05:00", closeTime: "12:00" },
            { day: "Friday", openTime: "14:00", closeTime: "21:00" },
            { day: "Saturday", openTime: "05:00", closeTime: "12:00" },
            { day: "Saturday", openTime: "14:00", closeTime: "21:00" },
            { day: "Sunday", openTime: "05:00", closeTime: "12:00" },
            { day: "Sunday", openTime: "14:00", closeTime: "21:00" },
          ],
          aartiTimings: [
            { name: "Morning Aarti", time: "06:00", day: "all" },
            { name: "Evening Aarti", time: "18:00", day: "all" },
          ],
          dressCode: "Traditional Indian attire, no leather items",
          entryFee: [
            { type: "General", amount: 0, description: "Free entry" },
            {
              type: "Special Darshan",
              amount: 500,
              description: "Special darshan with puja",
            },
          ],
          photography: true,
          bestTimeToVisit: "October to March for pleasant weather",
          festivals: [
            {
              name: "Diwali",
              date: "2024-11-01",
              description: "Festival of lights",
            },
            {
              name: "Navratri",
              date: "2024-10-03",
              description: "Nine nights of goddess worship",
            },
          ],
        },
      });
      console.log("  ✅ Temple details created");
    }
  }

  // Create sample reviews
  const allProperties = await prisma.property.findMany();
  const sampleReviews = [
    {
      rating: 5,
      title: "Amazing stay!",
      comment:
        "The hotel was excellent. Staff was very helpful and the location was perfect for our pilgrimage.",
      cleanliness: 5,
      service: 5,
      location: 5,
      value: 4,
    },
    {
      rating: 4,
      title: "Great experience",
      comment:
        "Very clean rooms and good amenities. Would definitely recommend to others.",
      cleanliness: 4,
      service: 4,
      location: 5,
      value: 4,
    },
    {
      rating: 5,
      title: "Perfect for families",
      comment:
        "We stayed with our family and had a wonderful time. The homestay experience was authentic.",
      cleanliness: 5,
      service: 5,
      location: 5,
      value: 5,
    },
  ];

  for (const property of allProperties.slice(0, 3)) {
    await prisma.review.upsert({
      where: {
        userId_propertyId: {
          userId: user.id,
          propertyId: property.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        propertyId: property.id,
        ...sampleReviews[
        allProperties.indexOf(property) % sampleReviews.length
        ],
        isVerified: true,
      },
    });
    console.log("✅ Review created for:", property.name);
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📝 Login credentials:");
  console.log("   Admin: admin@hosthaven.com / Admin@123");
  console.log("   User:  user@hosthaven.com / User@123");
  console.log("   Vendor: vendor@hosthaven.com / Vendor@123");

  // Create sample temples
  const temples = [
    {
      name: "Tirumala Tirupati Temple",
      slug: "tirumala-tirupati-temple",
      city: "TIRUPATI" as const,
      fullAddress:
        "Tirumala, Tirupati, Chittoor District, Andhra Pradesh - 517501",
      landmark: "Tirumala Hills",
      description:
        "Tirumala Tirupati Temple is one of the most visited religious places in the world. Dedicated to Lord Venkateswara (an incarnation of Vishnu), this ancient temple attracts millions of devotees annually. The temple complex sits atop the Tirumala hills and is known for its rich traditions, magnificent architecture, and the famous Srivari Prasadam (laddu).",
      shortDesc: "World's most visited pilgrimage center",
      latitude: 13.6828,
      longitude: 79.4192,
      deityName: "Lord Venkateswara",
      templeType: "Vaishnavite",
      builtYear: "300 AD",
      founder: "Unknown (Ancient)",
      mythologicalSignificance:
        "According to legends, Lord Vishnu descended to Earth as Venkateswara to save humanity from Kali Yuga troubles and to grant moksha to his devotees.",
      historicalSignificance:
        "The temple has been patronized by various dynasties including the Cholas, Pandyas, and Vijayanagara rulers. It is one of the wealthiest temples in the world.",
      architectureStyle: "Dravidian Architecture",
      uniqueFeatures:
        "Ananda Nilayam (Golden Sanctum), Srivari Mettu (Seven Hills), Chakra Teertham",
      sacredNearby:
        "Sri Kapileswaraswami Temple, Sri Padmavathi Ammavaru Temple, Silathoranam",
      associatedLegends:
        "The legend of Lord Venkateswara taking loan from Kubera for his marriage and the story of Bhakta Prahlada",
      darshanTimings: [
        {
          day: "Monday",
          morningOpen: "03:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Tuesday",
          morningOpen: "03:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Wednesday",
          morningOpen: "03:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Thursday",
          morningOpen: "03:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Friday",
          morningOpen: "03:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Saturday",
          morningOpen: "03:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Sunday",
          morningOpen: "03:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
      ],
      morningAarti: "05:00 AM",
      afternoonAarti: "12:00 PM",
      eveningAarti: "07:00 PM",
      specialSevas:
        "Archana, Sahasra Namarchana, Kalyanotsavam, Swarna Pushpanjali",
      festivalSpecificTimings:
        "Brahmotsavam (September-October), Vaikunta Ekadasi, Rathasapthami",
      generalEntryFee: "Free",
      specialDarshanFee: "₹300 - ₹500",
      vipDarshanFee: "₹1000 - ₹5000",
      parkingAvailable: true,
      wheelchairAccessible: true,
      cloakroomAvailable: true,
      restroomsAvailable: true,
      drinkingWaterAvailable: true,
      prasadamCounterAvailable: true,
      photographyAllowed: false,
      mobileRestrictions: "Mobile phones not allowed inside temple premises",
      dressCodeMen: "Dhoti and shirt or formal wear, no leather items",
      dressCodeWomen: "Saree or churidar, no leather items",
      securityNotes: "Security check at entry points, belongings scanned",
      majorFestivals:
        "Brahmotsavam, Vaikunta Ekadasi, Rathasapthami, Sri Ramanavami",
      festivalDates:
        "Brahmotsavam: September-October, Vaikunta Ekadasi: December-January",
      annualBrahmotsavam: "9 days festival with processions",
      rathotsavamDetails: "Annual chariot festival during Brahmotsavam",
      crowdExpectationLevel: "Very High",
      specialPoojas: "Suprabhata, Thomala Seva, Archana, Sahasra Namarchana",
      specialDecorationDays: "Fridays, Sundays, and festival days",
      bestMonths: "October to March",
      bestTimeOfDay: "Early morning (3-6 AM) for minimal crowd",
      peakCrowdDays: "Weekends, festival days, Saturdays",
      avoidDays: "Weekdays (except Friday)",
      weatherConditions:
        "Pleasant in winter (15-25°C), hot in summer (35-45°C)",
      nearbyTemples:
        "Sri Kapileswaraswami Temple (1km), Sri Padmavathi Temple (15km)",
      nearbyBeachesOrHills: "Tirumala Hills, Kapila Theertham (15km)",
      nearbyRestaurants: "TIRUPATI",
      nearbyHotels: "TIRUPATI",
      distanceRailwayStation: "Tirupati Main Station - 26km",
      distanceBusStand: "Tirupati Bus Station - 28km",
      distanceAirport: "Tirupati Airport - 40km",
      images: [
        {
          url: "https://images.unsplash.com/photo-1569429594044-bcc5ad652a65?w=800",
          alt: "Tirumala Temple Gopuram",
          isPrimary: true,
        },
        {
          url: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800",
          alt: "Temple Interior",
          isPrimary: false,
        },
        {
          url: "https://images.unsplash.com/photo-1589979481223-deb893043163?w=800",
          alt: "Lord Venkateswara",
          isPrimary: false,
        },
      ],
      videos: [
        { url: "https://www.youtube.com/watch?v=example1", alt: "Temple Tour" },
      ],
      virtualTourUrl: "https://tirumala.org/virtual-tour",
      metaTitle:
        "Tirumala Tirupati Temple | Book Darshan, Pooja & Accommodation",
      metaDescription:
        "Visit Tirumala Tirupati Temple - one of the world's most visited pilgrimage centers. Book darshan, special sevas, and accommodation online.",
      searchKeywords:
        "Tirupati temple, Tirumala darshan, Venkateswara temple, booking",
      thingsToCarry:
        "ID proof, water bottle, comfortable footwear, traditional dress",
      thingsNotAllowed: "Mobile phones, leather items, cameras, weapons",
      idealVisitDuration: "1-2 days",
      suggestedItinerary:
        "Day 1: Arrival, TTD counter registration, darshan. Day 2: Early morning darshan, temple visit, departure.",
      localFoodRecommendations:
        "Srivari Laddu (must try), South Indian thali, Pongal",
      faqs: [
        {
          question: "How to book darshan online?",
          answer: "Visit ttdonline.com or use TTD mobile app",
        },
        {
          question: "What is the best time to visit?",
          answer:
            "October to March for pleasant weather, early morning for less crowd",
        },
        {
          question: "Is accommodation available?",
          answer: "Yes, TTD provides free and paid accommodation complexes",
        },
      ],
      emergencyContact: "Toll Free: 1800 222 323",
      templeOfficePhone: "0877-2277777",
      active: true,
    },
    {
      name: "Srikalahasti Temple",
      slug: "srikalahasti-temple",
      city: "TIRUPATI" as const,
      fullAddress: "Srikalahasti, Chittoor District, Andhra Pradesh - 517644",
      landmark: "Near Srikalahasti Railway Station",
      description:
        "Srikalahasti Temple is one of the most famous Shiva temples in South India, known for its unique architecture and the rare Vayu Lingam (wind lingam). The temple is one of the Pancha Bhoota Stalas, representing the element of Wind (Vayu).",
      shortDesc: "Famous Shiva temple with Vayu Lingam",
      latitude: 13.7518,
      longitude: 79.7029,
      deityName: "Lord Shiva (Sri Kalahasteeswara)",
      templeType: "Shaivite",
      builtYear: "5th Century AD",
      founder: "Nandivarman (Ancient Chola King)",
      mythologicalSignificance:
        "According to legend, Shiva granted moksha to three devotees - spider (Sri), snake (Kali), and elephant (Hasthi) who prayed here. The temple name combines their names.",
      historicalSignificance:
        "Built by the Cholas and later expanded by Vijayanagara rulers. One of the most prominent Shiva temples in South India.",
      architectureStyle: "Dravidian Architecture with Vijayanagara influence",
      uniqueFeatures:
        "Vayu Lingam (one of the Pancha Bhoota Stalas), 1200 years old, largest Nandi idol",
      sacredNearby:
        "Srikalahasti Railway Station, Veyilingala Kona (holy hills)",
      associatedLegends:
        "Story of spider, snake, and elephant attaining moksha",
      darshanTimings: [
        {
          day: "Monday",
          morningOpen: "06:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "20:00",
        },
        {
          day: "Tuesday",
          morningOpen: "06:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "20:00",
        },
        {
          day: "Wednesday",
          morningOpen: "06:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "20:00",
        },
        {
          day: "Thursday",
          morningOpen: "06:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "20:00",
        },
        {
          day: "Friday",
          morningOpen: "06:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "20:00",
        },
        {
          day: "Saturday",
          morningOpen: "06:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "20:00",
        },
        {
          day: "Sunday",
          morningOpen: "06:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "20:00",
        },
      ],
      morningAarti: "07:00 AM",
      afternoonAarti: "12:00 PM",
      eveningAarti: "06:30 PM",
      specialSevas: "Rudrabhishekam, Kumbabishekam, Pradosha Puja",
      festivalSpecificTimings: "Karthigai Deepam, Maha Shivaratri",
      generalEntryFee: "Free",
      specialDarshanFee: "₹200",
      parkingAvailable: true,
      wheelchairAccessible: true,
      cloakroomAvailable: true,
      restroomsAvailable: true,
      drinkingWaterAvailable: true,
      prasadamCounterAvailable: true,
      photographyAllowed: true,
      mobileRestrictions: "Allowed outside sanctum",
      dressCodeMen: "Dhoti or formal wear, no leather",
      dressCodeWomen: "Saree or traditional wear",
      majorFestivals: "Karthigai Deepam, Maha Shivaratri, Panguni Uthiram",
      festivalDates:
        "Karthigai Deepam: November-December, Maha Shivaratri: February-March",
      crowdExpectationLevel: "High on weekends and festivals",
      bestMonths: "October to March",
      bestTimeOfDay: "Morning hours",
      nearbyTemples: "Tirumala (35km), Tirupati (36km)",
      nearbyBeachesOrHills: "Horsley Hills (80km)",
      distanceRailwayStation: "Srikalahasti Station - 2km",
      distanceBusStand: "Srikalahasti Bus Stand - 1km",
      distanceAirport: "Tirupati Airport - 50km",
      images: [
        {
          url: "https://images.unsplash.com/photo-1589979481223-deb893043163?w=800",
          alt: "Srikalahasti Temple",
          isPrimary: true,
        },
        {
          url: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800",
          alt: "Shiva Lingam",
          isPrimary: false,
        },
      ],
      metaTitle: "Srikalahasti Temple | Vayu Lingam | Book Darshan",
      metaDescription:
        "Visit Srikalahasti Temple - one of the Pancha Bhoota Stalas dedicated to Lord Shiva. Known for Vayu Lingam and ancient architecture.",
      thingsToCarry: "Traditional dress, water bottle",
      thingsNotAllowed: "Leather items inside temple",
      idealVisitDuration: "Half day",
      localFoodRecommendations: "South Indian thali, Pongal",
      emergencyContact: "08578-221777",
      active: true,
    },
    {
      name: "Kanaka Durga Temple",
      slug: "kanaka-durga-temple",
      city: "VIJAYAWADA" as const,
      fullAddress:
        "Indrakeeladri Hill, Vijayawada, Krishna District, Andhra Pradesh - 520001",
      landmark: "Indrakeeladri Hill",
      description:
        "Kanaka Durga Temple is a renowned Hindu temple dedicated to Goddess Kanaka Durga, located on the Indrakeeladri Hill in Vijayawada. The temple is known for its powerful deity and attracts devotees seeking protection and prosperity. The shrine is situated atop a hill offering panoramic views of Vijayawada city.",
      shortDesc: "Powerful goddess temple on hilltop",
      latitude: 16.5186,
      longitude: 80.6195,
      deityName: "Kanaka Durga",
      templeType: "Shakti Peetha",
      builtYear: "16th Century",
      founder: "King Vasireddy Venkatadri Nayudu",
      mythologicalSignificance:
        "According to legend, Goddess Kanaka Durga killed the demon Mahishasura on this hill. The hill is shaped like a bow (Indra Dhanush), hence the name Indrakeeladri.",
      historicalSignificance:
        "Built by the Reddy kings, later renovated by the British. One of the most visited temples in Andhra Pradesh.",
      architectureStyle: "Dravidian Architecture",
      uniqueFeatures:
        "Fast-moving hill (Indrakeeladri), annual Bonalu festival, Navaratri celebrations",
      sacredNearby: "Pradakshina Patha (circumambulation route), Devi Way",
      associatedLegends: "Story of Mahishasura Vadha by Goddess Durga",
      darshanTimings: [
        {
          day: "Monday",
          morningOpen: "05:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Tuesday",
          morningOpen: "05:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Wednesday",
          morningOpen: "05:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Thursday",
          morningOpen: "05:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Friday",
          morningOpen: "05:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Saturday",
          morningOpen: "05:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
        {
          day: "Sunday",
          morningOpen: "05:00",
          morningClose: "12:00",
          eveningOpen: "14:00",
          eveningClose: "21:00",
        },
      ],
      morningAarti: "06:00 AM",
      afternoonAarti: "12:00 PM",
      eveningAarti: "07:00 PM",
      specialSevas:
        "Kanaka Durga Sahasra Namarchana, Rudrabhishekam, Navaratri special pujas",
      festivalSpecificTimings: "Navratri (October), Bonalu (July-August)",
      generalEntryFee: "Free (₹50 for special darshan)",
      specialDarshanFee: "₹100 - ₹500",
      parkingAvailable: true,
      wheelchairAccessible: false,
      cloakroomAvailable: true,
      restroomsAvailable: true,
      drinkingWaterAvailable: true,
      prasadamCounterAvailable: true,
      photographyAllowed: true,
      dressCodeMen: "Traditional wear, no leather",
      dressCodeWomen: "Saree or traditional wear",
      securityNotes: "Security check at hill base",
      majorFestivals: "Navratri, Bonalu, Dussehra",
      festivalDates: "Navratri: October, Bonalu: July-August",
      crowdExpectationLevel: "Very High during Navratri",
      bestMonths: "October to March",
      bestTimeOfDay: "Early morning or evening",
      peakCrowdDays: "Fridays, Navratri, festival days",
      weatherConditions: "Pleasant in winter, hot in summer",
      nearbyTemples: "Maha Pradakshina Patha, Parvathi Temple",
      nearbyBeachesOrHills: "Indrakeeladri Hill, Bhavani Island (20km)",
      nearbyRestaurants: "Vijayawada City",
      nearbyHotels: "Vijayawada City",
      distanceRailwayStation: "Vijayawada Junction - 5km",
      distanceBusStand: "Vijayawada Bus Station - 3km",
      distanceAirport: "Vijayawada Airport - 15km",
      images: [
        {
          url: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800",
          alt: "Kanaka Durga Temple",
          isPrimary: true,
        },
        {
          url: "https://images.unsplash.com/photo-1569429594044-bcc5ad652a65?w=800",
          alt: "Temple Gopuram",
          isPrimary: false,
        },
      ],
      metaTitle: "Kanaka Durga Temple Vijayawada | Darshan Timings & Bookings",
      metaDescription:
        "Visit Kanaka Durga Temple on Indrakeeladri Hill. Known for powerful deity and Navratri celebrations.",
      thingsToCarry: "Water, comfortable shoes for hill climbing",
      thingsNotAllowed: "Non-vegetarian food, leather items",
      idealVisitDuration: "3-4 hours",
      localFoodRecommendations: "Andhra thali, pesarattu,百#",
      emergencyContact: "0866-2475555",
      active: true,
    },
  ];

  for (const templeData of temples) {
    await prisma.temple.upsert({
      where: { slug: templeData.slug },
      update: {},
      create: templeData,
    });
    console.log("✅ Temple created:", templeData.name);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
