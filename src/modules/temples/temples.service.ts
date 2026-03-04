import prisma from "../../config/database";
import { cacheService } from "../../services/cache.service";
import { logger } from "../../utils/logger.util";
import { ERROR_CODES } from "../../constants/error-codes";
import { Prisma } from "@prisma/client";

export class TemplesService {
  async getTemples(filters: {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    active?: boolean;
    deity?: string;
    templeType?: string;
    state?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TempleWhereInput = {};

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.city) {
      where.city = filters.city as any;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { deityName: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { fullAddress: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [temples, total] = await Promise.all([
      prisma.temple.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.temple.count({ where }),
    ]);

    return {
      data: temples,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(idOrSlug: string) {
    const cacheKey = `temple:${idOrSlug}`;
    const cached = await cacheService.get<any>(cacheKey);

    if (cached) {
      return cached;
    }

    // Try by ID first, then by slug
    let temple = await prisma.temple.findUnique({
      where: { id: idOrSlug },
    });

    if (!temple) {
      temple = await prisma.temple.findUnique({
        where: { slug: idOrSlug },
      });
    }

    if (!temple) {
      const error = new Error("Temple not found");
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await cacheService.set(
      cacheKey,
      temple,
      cacheService.getTTL().PROPERTY_DETAIL,
    );

    return temple;
  }

  async getByProperty(propertyId: string) {
    const temple = await prisma.templeDetails.findUnique({
      where: { propertyId },
    });

    if (!temple) {
      const error = new Error("Temple details not found");
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    return temple;
  }

  async getBySlug(slug: string) {
    const cacheKey = `temple:slug:${slug}`;
    const cached = await cacheService.get<any>(cacheKey);

    if (cached) {
      return cached;
    }

    const temple = await prisma.temple.findUnique({
      where: { slug },
    });

    if (!temple) {
      const error = new Error("Temple not found");
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await cacheService.set(
      cacheKey,
      temple,
      cacheService.getTTL().PROPERTY_DETAIL,
    );

    return temple;
  }

  async create(data: any) {
    // Check for slug conflict
    const existingSlug = await prisma.temple.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug) {
      // Append timestamp to slug to make it unique
      data.slug = `${data.slug}-${Date.now().toString(36)}`;
    }

    const temple = await prisma.temple.create({
      data: {
        name: data.name,
        slug: data.slug,
        city: data.city,
        fullAddress: data.fullAddress || "",
        landmark: data.landmark,
        description: data.description || "",
        shortDesc: data.shortDesc,
        latitude: data.latitude,
        longitude: data.longitude,
        deityName: data.deityName || "",
        templeType: data.templeType,
        builtYear: data.builtYear,
        founder: data.founder,
        mythologicalSignificance: data.mythologicalSignificance,
        historicalSignificance: data.historicalSignificance,
        architectureStyle: data.architectureStyle,
        uniqueFeatures: data.uniqueFeatures,
        sacredNearby: data.sacredNearby,
        associatedLegends: data.associatedLegends,
        darshanTimings: data.darshanTimings || [],
        morningAarti: data.morningAarti,
        afternoonAarti: data.afternoonAarti,
        eveningAarti: data.eveningAarti,
        specialSevas: data.specialSevas,
        festivalSpecificTimings: data.festivalSpecificTimings,
        generalEntryFee: data.generalEntryFee,
        specialDarshanFee: data.specialDarshanFee,
        vipDarshanFee: data.vipDarshanFee,
        parkingAvailable: data.parkingAvailable ?? false,
        wheelchairAccessible: data.wheelchairAccessible ?? false,
        cloakroomAvailable: data.cloakroomAvailable ?? false,
        restroomsAvailable: data.restroomsAvailable ?? false,
        drinkingWaterAvailable: data.drinkingWaterAvailable ?? false,
        prasadamCounterAvailable: data.prasadamCounterAvailable ?? false,
        photographyAllowed: data.photographyAllowed ?? true,
        mobileRestrictions: data.mobileRestrictions,
        dressCodeMen: data.dressCodeMen,
        dressCodeWomen: data.dressCodeWomen,
        securityNotes: data.securityNotes,
        majorFestivals: data.majorFestivals,
        festivalDates: data.festivalDates,
        annualBrahmotsavam: data.annualBrahmotsavam,
        rathotsavamDetails: data.rathotsavamDetails,
        crowdExpectationLevel: data.crowdExpectationLevel,
        specialPoojas: data.specialPoojas,
        specialDecorationDays: data.specialDecorationDays,
        bestMonths: data.bestMonths,
        bestTimeOfDay: data.bestTimeOfDay,
        peakCrowdDays: data.peakCrowdDays,
        avoidDays: data.avoidDays,
        weatherConditions: data.weatherConditions,
        nearbyTemples: data.nearbyTemples,
        nearbyBeachesOrHills: data.nearbyBeachesOrHills,
        nearbyRestaurants: data.nearbyRestaurants,
        nearbyHotels: data.nearbyHotels,
        distanceRailwayStation: data.distanceRailwayStation,
        distanceBusStand: data.distanceBusStand,
        distanceAirport: data.distanceAirport,
        images: data.images || [],
        videos: data.videos || [],
        virtualTourUrl: data.virtualTourUrl,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        searchKeywords: data.searchKeywords,
        canonicalUrl: data.canonicalUrl,
        openGraphImage: data.openGraphImage,
        structuredDataJsonLd: data.structuredDataJsonLd,
        devoteeTips: data.devoteeTips,
        thingsToCarry: data.thingsToCarry,
        thingsNotAllowed: data.thingsNotAllowed,
        idealVisitDuration: data.idealVisitDuration,
        suggestedItinerary: data.suggestedItinerary,
        localFoodRecommendations: data.localFoodRecommendations,
        faqs: data.faqs,
        emergencyContact: data.emergencyContact,
        templeOfficePhone: data.templeOfficePhone,
        lostAndFoundDesk: data.lostAndFoundDesk,
        medicalFacilityNearby: data.medicalFacilityNearby,
        policeStationNearby: data.policeStationNearby,
        active: data.active ?? true,
      },
    });

    logger.info({ templeId: temple.id }, "Temple created");

    return temple;
  }

  async update(id: string, data: any) {
    const temple = await prisma.temple.findUnique({
      where: { id },
    });

    if (!temple) {
      const error = new Error("Temple not found");
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    // Remove id and slug from update data to avoid conflicts
    const { id: _id, slug: _slug, ...updateData } = data;

    const updated = await prisma.temple.update({
      where: { id },
      data: updateData,
    });

    await cacheService.del(`temple:${id}`);
    await cacheService.del(`temple:slug:${temple.slug}`);

    logger.info({ templeId: id }, "Temple updated");

    return updated;
  }

  async activate(id: string) {
    const temple = await prisma.temple.findUnique({
      where: { id },
    });

    if (!temple) {
      const error = new Error("Temple not found");
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.temple.update({
      where: { id },
      data: { active: true },
    });

    await cacheService.del(`temple:${id}`);
    await cacheService.del(`temple:slug:${temple.slug}`);

    logger.info({ templeId: id }, "Temple activated");

    return { id: updated.id, active: updated.active };
  }

  async deactivate(id: string) {
    const temple = await prisma.temple.findUnique({
      where: { id },
    });

    if (!temple) {
      const error = new Error("Temple not found");
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.temple.update({
      where: { id },
      data: { active: false },
    });

    await cacheService.del(`temple:${id}`);
    await cacheService.del(`temple:slug:${temple.slug}`);

    logger.info({ templeId: id }, "Temple deactivated");

    return { id: updated.id, active: updated.active };
  }

  async delete(id: string) {
    const temple = await prisma.temple.findUnique({
      where: { id },
    });

    if (!temple) {
      const error = new Error("Temple not found");
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await prisma.temple.delete({
      where: { id },
    });

    await cacheService.del(`temple:${id}`);
    await cacheService.del(`temple:slug:${temple.slug}`);

    logger.info({ templeId: id }, "Temple deleted");

    return { message: "Temple deleted successfully" };
  }

  async getUpcomingEvents(templeId: string, days: number = 30) {
    const temple = await prisma.temple.findUnique({
      where: { id: templeId },
    });

    if (!temple) {
      const error = new Error("Temple not found");
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    return {
      specialEvents: [],
      festivals: [],
    };
  }
}

export const templesService = new TemplesService();
export default templesService;
