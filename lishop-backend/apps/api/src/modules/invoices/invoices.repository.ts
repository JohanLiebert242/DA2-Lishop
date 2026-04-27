import { Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';

export interface InvoiceData {
  id: string;
  orderId: string;
  userId: string;
  invoiceNo: string;
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  billingPhone: string;
  subtotalVnd: number;
  discountVnd: number;
  shippingFeeVnd: number;
  vatPercent: number;
  vatVnd: number;
  totalVnd: number;
  issuedAt: Date;
  order: {
    orderNumber: string;
    items: { productName: string; quantity: number; unitPriceVnd: number; totalPriceVnd: number }[];
  };
}

const INVOICE_INCLUDE = {
  order: {
    select: {
      orderNumber: true,
      items: {
        select: {
          productName: true,
          quantity: true,
          unitPriceVnd: true,
          totalPriceVnd: true,
        },
      },
    },
  },
};

export interface CreateInvoiceInput {
  orderId: string;
  userId: string;
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  billingPhone: string;
  subtotalVnd: number;
  discountVnd: number;
  shippingFeeVnd: number;
  vatPercent: number;
  vatVnd: number;
  totalVnd: number;
}

@Injectable()
export class InvoicesRepository {
  findByOrderId(orderId: string, userId?: string): Promise<InvoiceData | null> {
    return prisma.invoice.findFirst({
      where: userId ? { orderId, order: { userId } } : { orderId },
      include: INVOICE_INCLUDE,
    }) as Promise<InvoiceData | null>;
  }

  findByUserId(userId: string): Promise<InvoiceData[]> {
    return prisma.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      include: INVOICE_INCLUDE,
    }) as Promise<InvoiceData[]>;
  }

  findAll(): Promise<InvoiceData[]> {
    return prisma.invoice.findMany({
      orderBy: { issuedAt: 'desc' },
      include: {
        ...INVOICE_INCLUDE,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }) as Promise<InvoiceData[]>;
  }

  create(data: CreateInvoiceInput): Promise<InvoiceData> {
    const invoiceNo = `HD${Date.now()}`;
    return prisma.invoice.create({
      data: {
        invoiceNo,
        orderId: data.orderId,
        userId: data.userId,
        billingName: data.billingName,
        billingEmail: data.billingEmail,
        billingAddress: data.billingAddress,
        billingPhone: data.billingPhone,
        subtotalVnd: data.subtotalVnd,
        discountVnd: data.discountVnd,
        shippingFeeVnd: data.shippingFeeVnd,
        vatPercent: data.vatPercent,
        vatVnd: data.vatVnd,
        totalVnd: data.totalVnd,
      },
      include: INVOICE_INCLUDE,
    }) as Promise<InvoiceData>;
  }
}
