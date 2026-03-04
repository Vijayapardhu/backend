import prisma from '../../config/database';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';

const generateTicketNumber = () => `SUP-${Date.now().toString(36).toUpperCase()}`;

export class SupportService {
  async create(userId: string, data: {
    category: string;
    bookingReference?: string;
    message: string;
    attachmentUrl?: string;
  }) {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        ticketNumber: generateTicketNumber(),
        category: data.category,
        bookingReference: data.bookingReference,
        message: data.message,
        attachmentUrl: data.attachmentUrl,
        status: 'OPEN',
      },
    });
    logger.info({ supportTicketId: ticket.id }, 'Support ticket created');
    return ticket;
  }

  async getMyTickets(userId: string, filters: { page: number; limit: number; status?: string }) {
    const skip = (filters.page - 1) * filters.limit;
    const where: any = { userId, isDeleted: false };
    if (filters.status) where.status = filters.status;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where, skip, take: filters.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      meta: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
    };
  }

  async getAllTickets(filters: { page: number; limit: number; status?: string }) {
    const skip = (filters.page - 1) * filters.limit;
    const where: any = { isDeleted: false };
    if (filters.status) where.status = filters.status;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where, skip, take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      meta: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
    };
  }

  async getTicketById(id: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id, isDeleted: false },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!ticket) {
      const error = new Error('Support ticket not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    return ticket;
  }

  async updateTicket(id: string, data: { status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'; adminNotes?: string }) {
    const existing = await prisma.supportTicket.findUnique({ where: { id, isDeleted: false } });
    if (!existing) {
      const error = new Error('Support ticket not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
      updateData.resolvedAt = data.status === 'RESOLVED' ? new Date() : null;
    }
    if (data.adminNotes !== undefined) {
      // Append note with timestamp to existing notes
      const timestamp = new Date().toISOString();
      const newEntry = `[${timestamp}] ${data.adminNotes}`;
      updateData.adminNotes = existing.adminNotes
        ? `${existing.adminNotes}\n---\n${newEntry}`
        : newEntry;
    }

    const ticket = await prisma.supportTicket.update({ where: { id }, data: updateData });
    logger.info({ supportTicketId: id, status: data.status }, 'Support ticket updated');
    return ticket;
  }

  async addNote(id: string, content: string, addedBy: string) {
    const existing = await prisma.supportTicket.findUnique({ where: { id, isDeleted: false } });
    if (!existing) {
      const error = new Error('Support ticket not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const timestamp = new Date().toISOString();
    const newEntry = `[${timestamp}] (${addedBy}) ${content}`;
    const adminNotes = existing.adminNotes
      ? `${existing.adminNotes}\n---\n${newEntry}`
      : newEntry;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { adminNotes },
    });
    logger.info({ supportTicketId: id }, 'Note added to support ticket');
    return ticket;
  }

  async reopenTicket(id: string) {
    const existing = await prisma.supportTicket.findUnique({ where: { id, isDeleted: false } });
    if (!existing) {
      const error = new Error('Support ticket not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status: 'OPEN', resolvedAt: null },
    });
    logger.info({ supportTicketId: id }, 'Support ticket reopened');
    return ticket;
  }
}

export const supportService = new SupportService();
export default supportService;
