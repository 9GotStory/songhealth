import type { Config } from "@react-router/dev/config";

// SSR stays enabled for the Public boundary (Blueprint §217–§219). No Product
// routes or prerendered Product content exist in this Delivery.
export default {
  ssr: true,
} satisfies Config;
