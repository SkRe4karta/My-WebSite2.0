import speakeasy from "speakeasy";
import QRCode from "qrcode";

export interface TOTPConfig {
  secret: string;
  qrCodeUrl: string;
}

/**
 * Генерирует новый TOTP секрет для пользователя
 */
export function generateTOTPSecret(email: string): TOTPConfig {
  const secret = speakeasy.generateSecret({
    name: `zelyonkin.ru (${email})`,
    issuer: "zelyonkin.ru",
    length: 32,
  });

  return {
    secret: secret.base32 || "",
    qrCodeUrl: secret.otpauth_url || "",
  };
}

/**
 * Генерирует QR код в формате data URL
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Не удалось сгенерировать QR код");
  }
}

/**
 * Проверяет TOTP код
 */
export function verifyTOTP(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2, // Разрешаем отклонение в ±2 периода (60 секунд)
  });
}

/**
 * Генерирует резервные коды для восстановления
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Генерируем 8-значные коды
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
  }
  return codes;
}

