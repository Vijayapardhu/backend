import { FastifyRequest, FastifyReply } from "fastify";
import templesService from "./temples.service";
import { sendSuccess, sendError } from "../../utils/response.util";
import { ERROR_CODES } from "../../constants/error-codes";
import { logger } from "../../utils/logger.util";
import { z } from "zod";
import { templeAIService } from "../../services/temple-ai.service";

const templeFilterSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

const templeIdSchema = z.object({
  id: z.string().min(1),
});

const createTempleSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  city: z.enum(["VIJAYAWADA", "NANDIYALA", "VETLAPALEM", "TIRUPATI"]),
  fullAddress: z.string().optional(),
  landmark: z.string().optional(),
  description: z.string().optional(),
  shortDesc: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  deityName: z.string().optional(),
  templeType: z.string().optional(),
  builtYear: z.string().optional(),
  founder: z.string().optional(),
  mythologicalSignificance: z.string().optional(),
  historicalSignificance: z.string().optional(),
  architectureStyle: z.string().optional(),
  uniqueFeatures: z.string().optional(),
  sacredNearby: z.string().optional(),
  associatedLegends: z.string().optional(),
  darshanTimings: z.array(z.any()).optional(),
  morningAarti: z.string().optional(),
  afternoonAarti: z.string().optional(),
  eveningAarti: z.string().optional(),
  specialSevas: z.string().optional(),
  festivalSpecificTimings: z.string().optional(),
  generalEntryFee: z.string().optional(),
  specialDarshanFee: z.string().optional(),
  vipDarshanFee: z.string().optional(),
  parkingAvailable: z.boolean().optional(),
  wheelchairAccessible: z.boolean().optional(),
  cloakroomAvailable: z.boolean().optional(),
  restroomsAvailable: z.boolean().optional(),
  drinkingWaterAvailable: z.boolean().optional(),
  prasadamCounterAvailable: z.boolean().optional(),
  photographyAllowed: z.boolean().optional(),
  mobileRestrictions: z.string().optional(),
  dressCodeMen: z.string().optional(),
  dressCodeWomen: z.string().optional(),
  securityNotes: z.string().optional(),
  majorFestivals: z.string().optional(),
  festivalDates: z.string().optional(),
  annualBrahmotsavam: z.string().optional(),
  rathotsavamDetails: z.string().optional(),
  crowdExpectationLevel: z.string().optional(),
  specialPoojas: z.string().optional(),
  specialDecorationDays: z.string().optional(),
  bestMonths: z.string().optional(),
  bestTimeOfDay: z.string().optional(),
  peakCrowdDays: z.string().optional(),
  avoidDays: z.string().optional(),
  weatherConditions: z.string().optional(),
  nearbyTemples: z.string().optional(),
  nearbyBeachesOrHills: z.string().optional(),
  nearbyRestaurants: z.string().optional(),
  nearbyHotels: z.string().optional(),
  distanceRailwayStation: z.string().optional(),
  distanceBusStand: z.string().optional(),
  distanceAirport: z.string().optional(),
  images: z.array(z.any()).optional(),
  videos: z.array(z.any()).optional(),
  virtualTourUrl: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  searchKeywords: z.string().optional(),
  canonicalUrl: z.string().optional(),
  openGraphImage: z.string().optional(),
  structuredDataJsonLd: z.string().optional(),
  devoteeTips: z.string().optional(),
  thingsToCarry: z.string().optional(),
  thingsNotAllowed: z.string().optional(),
  idealVisitDuration: z.string().optional(),
  suggestedItinerary: z.string().optional(),
  localFoodRecommendations: z.string().optional(),
  faqs: z.any().optional(),
  emergencyContact: z.string().optional(),
  templeOfficePhone: z.string().optional(),
  lostAndFoundDesk: z.string().optional(),
  medicalFacilityNearby: z.string().optional(),
  policeStationNearby: z.string().optional(),
  active: z.boolean().optional(),
});

const updateTempleSchema = createTempleSchema.partial();

const aiAutofillSchema = z.object({
  templeName: z.string().min(2),
  city: z.string().optional(),
  additionalContext: z.string().max(3000).optional(),
  forceComplete: z.boolean().optional(),
});

const ensurePrefillReport = (result: any) => {
  if (result?.prefillReport) {
    return result;
  }

  const draft = result?.draft || {};
  let totalFields = 0;
  let filledFields = 0;
  const missingFields: string[] = [];

  for (const [key, value] of Object.entries(draft)) {
    if (key === "darshanTimings") {
      totalFields += 1;
      if (Array.isArray(value) && value.length > 0) {
        filledFields += 1;
      } else {
        missingFields.push(key);
      }
      continue;
    }

    if (typeof value === "boolean") {
      totalFields += 1;
      filledFields += 1;
      continue;
    }

    if (typeof value === "string") {
      totalFields += 1;
      if (value.trim().length > 0) {
        filledFields += 1;
      } else {
        missingFields.push(key);
      }
    }
  }

  return {
    ...result,
    prefillReport: {
      totalFields,
      filledFields,
      missingFields,
      pass2Attempted: false,
      pass2FilledFields: 0,
    },
  };
};

export const TemplesController = {
  async getTemples(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = templeFilterSchema.parse(request.query);

      const result = await templesService.getTemples({
        page: query.page,
        limit: query.limit,
        search: query.search,
        city: query.city,
        active: query.active,
      });

      return sendSuccess(reply, result.data, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get temples failed");
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query parameters",
          400,
        );
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch temples",
        500,
      );
    }
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as any;
      const idOrSlug = params.idOrSlug;
      logger.info({ idOrSlug }, "Getting temple");
      const temple = await templesService.getById(idOrSlug);
      return sendSuccess(reply, temple);
    } catch (error: any) {
      logger.error({ error, params: request.params }, "Get temple failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch temple",
        500,
      );
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createTempleSchema.parse(request.body);

      const temple = await templesService.create(data);

      return sendSuccess(reply, temple, 201);
    } catch (error: any) {
      logger.error({ error }, "Create temple failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.code === ERROR_CODES.RESOURCE_CONFLICT) {
        return sendError(reply, error.code, error.message, 409);
      }
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create temple",
        500,
      );
    }
  },

  async aiAutofill(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = aiAutofillSchema.parse(request.body);

      const result = await templeAIService.generateAutofill({
        templeName: body.templeName,
        city: body.city,
        additionalContext: body.additionalContext,
        forceComplete: body.forceComplete,
      });

      return sendSuccess(reply, ensurePrefillReport(result), 200);
    } catch (error: any) {
      logger.error({ error }, "Temple AI autofill failed");
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid AI autofill request",
          400,
        );
      }

      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        error?.message || "Failed to generate temple autofill",
        500,
      );
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = templeIdSchema.parse(request.params);
      const data = updateTempleSchema.parse(request.body);

      const temple = await templesService.update(id, data);

      return sendSuccess(reply, temple);
    } catch (error: any) {
      logger.error({ error }, "Update temple failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.code === ERROR_CODES.RESOURCE_CONFLICT) {
        return sendError(reply, error.code, error.message, 409);
      }
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update temple",
        500,
      );
    }
  },

  async activate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = templeIdSchema.parse(request.params);
      const result = await templesService.activate(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Activate temple failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to activate temple",
        500,
      );
    }
  },

  async deactivate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = templeIdSchema.parse(request.params);
      const result = await templesService.deactivate(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Deactivate temple failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to deactivate temple",
        500,
      );
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = templeIdSchema.parse(request.params);
      const result = await templesService.delete(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Delete temple failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to delete temple",
        500,
      );
    }
  },
};
