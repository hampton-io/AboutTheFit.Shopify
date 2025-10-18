/**
 * Type definitions for the virtual try-on feature
 */

import type { TryOnStatus, TryOnRequest } from '../db.server';

// Request types
export interface CreateTryOnRequest {
  productId: string;
  userPhoto: File | string; // File object or base64 string
}

export interface ProcessTryOnRequest {
  requestId: string;
}

// Response types - Use Prisma-generated type
export type TryOnRequestData = TryOnRequest;

export interface TryOnListResponse {
  requests: TryOnRequestData[];
  total: number;
  page: number;
  pageSize: number;
}

// Product types
export interface ProductData {
  id: string;
  title: string;
  handle: string;
  images: ProductImage[];
  featuredImage?: ProductImage;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

// Shopify GraphQL response types
export interface ShopifyProductResponse {
  product: {
    id: string;
    title: string;
    handle: string;
    featuredImage: {
      url: string;
      altText: string | null;
    } | null;
    images: {
      edges: Array<{
        node: {
          id: string;
          url: string;
          altText: string | null;
        };
      }>;
    };
  } | null;
}

export interface ShopifyProductsSearchResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        featuredImage: {
          url: string;
          altText: string | null;
        } | null;
      };
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
  };
}

// AI service types
export interface AIGenerationRequest {
  userPhotoUrl: string;
  clothingImageUrl: string;
  clothingName: string;
}

export interface AIGenerationResponse {
  success: boolean;
  resultImageUrl?: string;
  error?: string;
  metadata?: {
    analysisText?: string;
    processingTime?: number;
  };
}

// App metadata types
export interface AppMetadataData {
  id: string;
  shop: string;
  creditsUsed: number;
  creditsLimit: number;
  isActive: boolean;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Form data types
export interface TryOnFormData {
  productId: string;
  productTitle: string;
  productImage: string;
  userPhoto: File | null;
}

// UI state types
export interface TryOnUIState {
  selectedProduct: ProductData | null;
  uploadedPhoto: string | null;
  isProcessing: boolean;
  currentRequest: TryOnRequestData | null;
  error: string | null;
}

// Credit/billing types
export interface CreditCheck {
  hasCredits: boolean;
  creditsRemaining: number;
  creditsUsed: number;
  creditsLimit: number;
}

// Settings types
export interface AppSettings {
  maxFileSize: number; // in bytes
  allowedFileTypes: string[];
  maxTryOnsPerDay: number;
  enableAutoDelete: boolean;
  autoDeleteDays: number;
}

