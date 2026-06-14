import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class PaymentsGatewayService {
  private getMockPaymentUrl(orderId: string, method: 'VNPAY' | 'MOMO' | 'ZALOPAY'): string {
    const simulatorUrl =
      process.env['PAYMENT_SIMULATOR_URL'] ||
      'http://localhost:3004/checkout/payment-simulator';
    const params = new URLSearchParams({ orderId, method });
    return `${simulatorUrl}?${params.toString()}`;
  }

  private usesDemoVNPayCredentials(tmnCode: string, hashSecret: string): boolean {
    return tmnCode === 'DEMO' || hashSecret === 'DEMO_SECRET';
  }

  private usesDemoMoMoCredentials(
    partnerCode: string,
    accessKey: string,
    secretKey: string,
  ): boolean {
    return (
      partnerCode === 'MOMO_DEMO' ||
      accessKey === 'DEMO_ACCESS' ||
      secretKey === 'DEMO_SECRET'
    );
  }

  private usesDemoZaloPayCredentials(appId: string, key1: string): boolean {
    return appId === '2554' || key1 === 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn';
  }

  // ─── VNPAY ───────────────────────────────────────────────────────────────────

  generateVNPayUrl(
    orderId: string,
    amountVnd: number,
    orderInfo: string,
    clientIp: string,
  ): string {
    const tmnCode = process.env['VNPAY_TMN_CODE'] ?? 'DEMO';
    const hashSecret = process.env['VNPAY_HASH_SECRET'] ?? 'DEMO_SECRET';
    const vnpUrl =
      process.env['VNPAY_URL'] ??
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl =
      process.env['VNPAY_RETURN_URL'] ??
      'http://localhost:3004/checkout/payment-result';

    if (this.usesDemoVNPayCredentials(tmnCode, hashSecret)) {
      return this.getMockPaymentUrl(orderId, 'VNPAY');
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const createDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000);
    const expireDateStr = `${expireDate.getFullYear()}${pad(expireDate.getMonth() + 1)}${pad(expireDate.getDate())}${pad(expireDate.getHours())}${pad(expireDate.getMinutes())}${pad(expireDate.getSeconds())}`;

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId.replace(/-/g, ''),
      vnp_OrderInfo: orderInfo.slice(0, 255),
      vnp_OrderType: '190000',
      vnp_Amount: String(amountVnd * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: clientIp,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDateStr,
    };

    const sorted = Object.fromEntries(Object.entries(params).sort());
    const signData = new URLSearchParams(sorted).toString();
    const hmac = createHmac('sha512', hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;
  }

  verifyVNPayReturn(query: Record<string, string>): boolean {
    const hashSecret = process.env['VNPAY_HASH_SECRET'] ?? 'DEMO_SECRET';
    const secureHash = query['vnp_SecureHash'];
    const params = { ...query };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];
    const sorted = Object.fromEntries(Object.entries(params).sort());
    const signData = new URLSearchParams(sorted).toString();
    const hmac = createHmac('sha512', hashSecret);
    const expected = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    return expected === secureHash;
  }

  // ─── MoMo ────────────────────────────────────────────────────────────────────

  async generateMoMoUrl(
    orderId: string,
    amountVnd: number,
  ): Promise<{ payUrl: string; requestId: string }> {
    const partnerCode = process.env['MOMO_PARTNER_CODE'] ?? 'MOMO_DEMO';
    const accessKey = process.env['MOMO_ACCESS_KEY'] ?? 'DEMO_ACCESS';
    const secretKey = process.env['MOMO_SECRET_KEY'] ?? 'DEMO_SECRET';
    const endpoint =
      process.env['MOMO_ENDPOINT'] ??
      'https://test-payment.momo.vn/v2/gateway/api/create';
    const returnUrl =
      process.env['MOMO_RETURN_URL'] ??
      'http://localhost:3004/checkout/payment-result';
    const ipnUrl =
      process.env['MOMO_IPN_URL'] ?? 'http://localhost:4000/payments/momo/ipn';

    const requestId = `${orderId}-${Date.now()}`;
    if (this.usesDemoMoMoCredentials(partnerCode, accessKey, secretKey)) {
      return {
        payUrl: this.getMockPaymentUrl(orderId, 'MOMO'),
        requestId,
      };
    }

    const requestType = 'payWithMethod';
    const extraData = '';
    const orderInfo = `Thanh toan don hang #${orderId.slice(0, 8)}`;

    const rawSignature = `accessKey=${accessKey}&amount=${amountVnd}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${requestId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode,
      accessKey,
      requestId,
      amount: amountVnd,
      orderId: requestId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { payUrl?: string; message?: string };
      if (!data.payUrl) {
        return {
          payUrl: `https://test-payment.momo.vn/demo?orderId=${requestId}`,
          requestId,
        };
      }
      return { payUrl: data.payUrl, requestId };
    } catch {
      return {
        payUrl: `https://test-payment.momo.vn/demo?orderId=${requestId}`,
        requestId,
      };
    }
  }

  verifyMoMoIpn(body: Record<string, string | number>): boolean {
    const secretKey = process.env['MOMO_SECRET_KEY'] ?? 'DEMO_SECRET';
    const accessKey = process.env['MOMO_ACCESS_KEY'] ?? 'DEMO_ACCESS';
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = body as Record<string, string | number>;
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const expected = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');
    return expected === signature;
  }

  // ─── ZaloPay ─────────────────────────────────────────────────────────────────

  async generateZaloPayUrl(
    orderId: string,
    amountVnd: number,
  ): Promise<{ orderUrl: string; zpTransToken: string }> {
    const appId = process.env['ZALOPAY_APP_ID'] ?? '2554';
    const key1 =
      process.env['ZALOPAY_KEY1'] ?? 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn';
    const endpoint =
      process.env['ZALOPAY_ENDPOINT'] ??
      'https://sb-openapi.zalopay.vn/v2/create';
    const callbackUrl =
      process.env['ZALOPAY_CALLBACK_URL'] ??
      'http://localhost:4000/payments/zalopay/callback';
    const returnUrl =
      process.env['ZALOPAY_RETURN_URL'] ??
      'http://localhost:3004/checkout/payment-result';

    if (this.usesDemoZaloPayCredentials(appId, key1)) {
      return {
        orderUrl: this.getMockPaymentUrl(orderId, 'ZALOPAY'),
        zpTransToken: `${orderId}-simulated`,
      };
    }

    const now = new Date();
    const appTransId = `${now.getFullYear().toString().slice(2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${orderId.slice(0, 8)}`;
    const appTime = Date.now();
    const embedData = JSON.stringify({ returnurl: returnUrl });
    const items = '[]';

    const data = `${appId}|${appTransId}|${orderId}|${amountVnd}|${appTime}|${embedData}|${items}`;
    const mac = createHmac('sha256', key1).update(data).digest('hex');

    const body = {
      app_id: appId,
      app_trans_id: appTransId,
      app_user: orderId,
      app_time: appTime,
      item: items,
      embed_data: embedData,
      amount: amountVnd,
      description: `Thanh toan don hang #${orderId.slice(0, 8)}`,
      bank_code: '',
      callback_url: callbackUrl,
      mac,
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = (await res.json()) as {
        order_url?: string;
        zp_trans_token?: string;
      };
      return {
        orderUrl:
          d.order_url ??
          `https://sb-openapi.zalopay.vn/demo?trans=${appTransId}`,
        zpTransToken: d.zp_trans_token ?? appTransId,
      };
    } catch {
      return {
        orderUrl: `https://sb-openapi.zalopay.vn/demo?trans=${appTransId}`,
        zpTransToken: appTransId,
      };
    }
  }

  verifyZaloPayCallback(data: string, mac: string): boolean {
    const key2 =
      process.env['ZALOPAY_KEY2'] ?? 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf';
    const expected = createHmac('sha256', key2).update(data).digest('hex');
    return expected === mac;
  }
}
