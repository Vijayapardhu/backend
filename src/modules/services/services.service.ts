import prisma from '../../config/database'
import { logger } from '../../utils/logger.util'
import { ERROR_CODES } from '../../constants/error-codes'
import type { CreateServiceInput, UpdateServiceInput, ServiceFilterInput } from './services.schema'

class ServicesService {
  async create(data: CreateServiceInput) {
    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        price: data.basePrice,
        priceUnit: 'per_person',
        advanceType: data.advanceType || 'percentage',
        advanceValue: data.advanceValue || 30,
        images: data.images || [],
        isActive: data.active !== false,
      },
    })
    logger.info({ serviceId: service.id }, 'Service created')
    return service
  }

  async update(id: string, data: UpdateServiceInput) {
    const existing = await prisma.service.findUnique({ where: { id } })
    if (!existing) {
      const error = new Error('Service not found')
      ;(error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND
      throw error
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.basePrice !== undefined && { price: data.basePrice }),
        ...(data.advanceType && { advanceType: data.advanceType }),
        ...(data.advanceValue !== undefined && { advanceValue: data.advanceValue }),
        ...(data.images && { images: data.images }),
        ...(data.active !== undefined && { isActive: data.active }),
      },
    })
    logger.info({ serviceId: service.id }, 'Service updated')
    return service
  }

  async delete(id: string) {
    const existing = await prisma.service.findUnique({ where: { id } })
    if (!existing) {
      const error = new Error('Service not found')
      ;(error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND
      throw error
    }

    await prisma.service.update({
      where: { id },
      data: { isDeleted: true },
    })
    logger.info({ serviceId: id }, 'Service deleted')
    return { message: 'Service deleted successfully' }
  }

  async getById(id: string) {
    const service = await prisma.service.findUnique({
      where: { id, isDeleted: false },
    })
    if (!service) {
      const error = new Error('Service not found')
      ;(error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND
      throw error
    }
    return service
  }

  async getAll(filters: ServiceFilterInput) {
    const { page, limit, search, category, active } = filters
    const skip = (page - 1) * limit

    const where: any = {
      isDeleted: false,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category) {
      where.category = category
    }

    if (active !== undefined) {
      where.isActive = active
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.service.count({ where }),
    ])

    return {
      services,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async activate(id: string) {
    const service = await prisma.service.update({
      where: { id },
      data: { isActive: true },
    })
    logger.info({ serviceId: id }, 'Service activated')
    return service
  }

  async deactivate(id: string) {
    const service = await prisma.service.update({
      where: { id },
      data: { isActive: false },
    })
    logger.info({ serviceId: id }, 'Service deactivated')
    return service
  }
}

export const servicesService = new ServicesService()
export default servicesService
