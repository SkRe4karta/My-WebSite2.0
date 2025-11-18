import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { generateTOTPSecret, generateQRCode } from "@/lib/totp";
import crypto from "crypto";

/**
 * GET /api/auth/2fa/setup - Получить QR код для настройки 2FA
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    
    // Проверяем, не настроен ли уже 2FA (игнорируем временные секреты)
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpSecret: true },
    });

    // Если есть постоянный секрет (не временный), нужно сначала отключить
    if (userData?.totpSecret && !userData.totpSecret.startsWith("temp:")) {
      return NextResponse.json(
        { error: "2FA уже настроен. Сначала отключите его." },
        { status: 400 }
      );
    }

    // Генерируем новый секрет
    const config = generateTOTPSecret(user.email || "zelyonkin.d@gmail.com");
    
    // Генерируем QR код
    const qrCodeUrl = await generateQRCode(config.qrCodeUrl);

    // Временно сохраняем секрет в сессии (через cookie или в БД с временным флагом)
    // Для простоты сохраним в БД с пометкой, что это временный секрет
    // В реальности лучше использовать сессию или Redis
    const tempSecret = crypto.randomBytes(16).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: `temp:${tempSecret}:${config.secret}` },
    });

    return NextResponse.json({
      secret: config.secret,
      qrCodeUrl,
      otpauthUrl: config.qrCodeUrl,
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return NextResponse.json(
      { error: "Ошибка при настройке 2FA" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/2fa/setup - Подтвердить настройку 2FA с кодом
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { token, backupCodes } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Требуется код подтверждения" },
        { status: 400 }
      );
    }

    // Получаем временный секрет
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpSecret: true },
    });

    if (!userData?.totpSecret || !userData.totpSecret.startsWith("temp:")) {
      return NextResponse.json(
        { error: "Сначала запросите QR код" },
        { status: 400 }
      );
    }

    // Извлекаем секрет из временного формата
    const secret = userData.totpSecret.split(":")[2];

    // Проверяем код
    const { verifyTOTP } = await import("@/lib/totp");
    const isValid = verifyTOTP(secret, token);

    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный код подтверждения" },
        { status: 400 }
      );
    }

    // Сохраняем секрет (без префикса temp:)
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret },
    });

    // Сохраняем резервные коды в настройках пользователя
    if (backupCodes && Array.isArray(backupCodes)) {
      // Сохраняем в UserSetting или в отдельной таблице
      // Для простоты сохраним в UserSetting как JSON
      await prisma.userSetting.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          backupCodes: JSON.stringify(backupCodes),
        },
        update: {
          backupCodes: JSON.stringify(backupCodes),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming 2FA setup:", error);
    return NextResponse.json(
      { error: "Ошибка при подтверждении 2FA" },
      { status: 500 }
    );
  }
}

