import "server-only";
import { prisma } from "./prisma.server";
import { SubscriptionStatus, SubscriptionPlan } from "@prisma/client";
import { logger } from "./logger";

/**
 * Subscription check result
 */
export interface SubscriptionCheck {
  isValid: boolean;
  status: SubscriptionStatus | null;
  plan: SubscriptionPlan | null;
  message?: string;
  daysRemaining?: number;
}

/**
 * Check if restaurant subscription is valid
 * Returns validation result with details
 *
 * Security: FAIL-CLOSED in production.
 * - Any DB error, Stripe error, or undefined state → deny access
 * - Development: fail-open allowed for DX
 */
export async function checkRestaurantSubscription(
  restaurantId: string
): Promise<SubscriptionCheck> {
  try {
    // Get restaurant with subscription
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        subscription: true,
      },
    });

    if (!restaurant) {
      logger.warn("Subscription verification failed", {
        restaurantId,
        reason: "restaurant_not_found",
      });
      return {
        isValid: false,
        status: null,
        plan: null,
        message: "Restaurant not found",
      };
    }

    // No subscription = trial mode (allow access)
    if (!restaurant.subscription) {
      return {
        isValid: true,
        status: "TRIAL" as SubscriptionStatus,
        plan: "BASIC" as SubscriptionPlan,
        message: "Trial access",
      };
    }

    const subscription = restaurant.subscription;
    const now = new Date();

    // Check status
    switch (subscription.status) {
      case "ACTIVE":
        // Check if subscription has end date and is expired
        if (subscription.endDate && new Date(subscription.endDate) < now) {
          // Expired but still marked ACTIVE - update status
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "EXPIRED" },
          });

          return {
            isValid: false,
            status: "EXPIRED",
            plan: subscription.plan,
            message: "Subscription has expired",
          };
        }

        // Calculate days remaining
        const daysRemaining = subscription.endDate
          ? Math.ceil((new Date(subscription.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          isValid: true,
          status: "ACTIVE",
          plan: subscription.plan,
          message: "Active subscription",
          daysRemaining: daysRemaining ?? undefined,
        };

      case "TRIAL":
        // Check trial end date
        if (subscription.trialEndDate && new Date(subscription.trialEndDate) < now) {
          // Trial expired - update status
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "EXPIRED" },
          });

          return {
            isValid: false,
            status: "EXPIRED",
            plan: subscription.plan,
            message: "Trial period has ended",
          };
        }

        const trialDaysRemaining = subscription.trialEndDate
          ? Math.ceil((new Date(subscription.trialEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          isValid: true,
          status: "TRIAL",
          plan: subscription.plan,
          message: "Trial period active",
          daysRemaining: trialDaysRemaining ?? undefined,
        };

      case "SUSPENDED":
        return {
          isValid: false,
          status: "SUSPENDED",
          plan: subscription.plan,
          message: "Subscription is suspended",
        };

      case "CANCELLED":
        return {
          isValid: false,
          status: "CANCELLED",
          plan: subscription.plan,
          message: "Subscription has been cancelled",
        };

      case "EXPIRED":
        return {
          isValid: false,
          status: "EXPIRED",
          plan: subscription.plan,
          message: "Subscription has expired",
        };

      default:
        logger.warn("Subscription verification failed", {
          restaurantId,
          reason: "invalid_status",
          status: subscription.status,
        });
        return {
          isValid: false,
          status: subscription.status,
          plan: subscription.plan,
          message: "Invalid subscription status",
        };
    }
  } catch (error) {
    logger.error(
      "Subscription check system error",
      { restaurantId },
      error instanceof Error ? error : undefined
    );

    // FAIL-CLOSED in production: Deny access when state is uncertain
    if (process.env.NODE_ENV === "production") {
      return {
        isValid: false,
        status: null,
        plan: null,
        message: "Subscription verification failed",
      };
    }

    // Development: Fail-open for DX (local DB down, etc.)
    return {
      isValid: true,
      status: "TRIAL" as SubscriptionStatus,
      plan: "BASIC" as SubscriptionPlan,
      message: "Subscription check failed - allowing access (dev only)",
    };
  }
}

/**
 * Require valid subscription for restaurant
 * Throws error if subscription is invalid
 */
export async function requireValidSubscription(restaurantId: string): Promise<void> {
  const check = await checkRestaurantSubscription(restaurantId);

  if (!check.isValid) {
    throw new Error(`Subscription required: ${check.message}`);
  }
}

/**
 * Get subscription features based on plan
 */
export function getSubscriptionFeatures(plan: SubscriptionPlan): string[] {
  switch (plan) {
    case "BASIC":
      return [
        "QR Menu",
        "Order Management",
        "Basic Analytics",
        "Email Support",
      ];

    case "PRO":
      return [
        "Everything in Basic",
        "Advanced Analytics",
        "Multi-location Support",
        "Priority Support",
        "Custom Branding",
      ];

    case "ENTERPRISE":
      return [
        "Everything in Pro",
        "Unlimited Locations",
        "API Access",
        "Dedicated Support",
        "Custom Integrations",
        "White-label Options",
      ];

    default:
      return [];
  }
}
