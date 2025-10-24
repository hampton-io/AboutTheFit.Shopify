import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';

/**
 * Admin API for managing canned images
 */

// GET - List all canned images
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  try {
    const images = await prisma.cannedImage.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return Response.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('Error fetching canned images:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch canned images',
      },
      { status: 500 }
    );
  }
};

// POST - Create or update canned image
export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { id, name, imageUrl, description, gender, isActive, sortOrder } = body;

      if (!name || !imageUrl) {
        return Response.json(
          {
            success: false,
            error: 'Name and imageUrl are required',
          },
          { status: 400 }
        );
      }

      let result;

      if (id) {
        // Update existing
        result = await prisma.cannedImage.update({
          where: { id },
          data: {
            name,
            imageUrl,
            description,
            gender,
            isActive: isActive !== undefined ? isActive : true,
            sortOrder: sortOrder !== undefined ? sortOrder : 0,
          },
        });
      } else {
        // Create new
        result = await prisma.cannedImage.create({
          data: {
            name,
            imageUrl,
            description,
            gender,
            isActive: isActive !== undefined ? isActive : true,
            sortOrder: sortOrder !== undefined ? sortOrder : 0,
          },
        });
      }

      return Response.json({
        success: true,
        image: result,
        message: id ? 'Image updated successfully' : 'Image created successfully',
      });
    } catch (error) {
      console.error('Error creating/updating canned image:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to save canned image',
        },
        { status: 500 }
      );
    }
  }

  if (request.method === 'DELETE') {
    try {
      const body = await request.json();
      const { id } = body;

      if (!id) {
        return Response.json(
          {
            success: false,
            error: 'ID is required',
          },
          { status: 400 }
        );
      }

      await prisma.cannedImage.delete({
        where: { id },
      });

      return Response.json({
        success: true,
        message: 'Image deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting canned image:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to delete canned image',
        },
        { status: 500 }
      );
    }
  }

  return Response.json(
    {
      success: false,
      error: 'Method not allowed',
    },
    { status: 405 }
  );
};

