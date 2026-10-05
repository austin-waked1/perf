// FORMA Store — WPGraphQL / WooGraphQL query documents.
//
// Every document below has been validated against the LIVE endpoint
// (NEXT_PUBLIC_WORDPRESS_URL). Notes on schema compatibility:
//   - stockStatus / stockQuantity live behind `... on InventoriedProduct`
//   - attributes live behind `... on ProductWithAttributes`; the attribute
//     slug only exists on `... on GlobalProductAttribute`
//   - prices are fetched per product type (SimpleProduct / VariableProduct /
//     ExternalProduct) plus ProductVariation for variation nodes
//   - addToCart takes `variation: [ProductAttributeInput]`
//     ({ attributeName, attributeValue }) for variable products
//   - checkout takes `billing` / `shipping` (CustomerAddressInput) with
//     `country` as a CountriesEnum value

// ── Catalog ─────────────────────────────────────────────────────────────────

export const GET_CATEGORIES = /* GraphQL */ `
  query GetCategories {
    productCategories(first: 24, where: { hideEmpty: true }) {
      nodes {
        id
        databaseId
        slug
        name
        description
        image {
          sourceUrl
          altText
        }
        products(first: 100) {
          nodes {
            id
          }
        }
      }
    }
  }
`;

export const GET_PRODUCTS = /* GraphQL */ `
  query GetProducts($first: Int, $category: String, $search: String) {
    products(first: $first, where: { category: $category, search: $search }) {
      nodes {
        id
        databaseId
        slug
        name
        type
        shortDescription
        description
        image {
          sourceUrl
          altText
        }
        galleryImages(first: 10) {
          nodes {
            sourceUrl
          }
        }
        onSale
        featured
        averageRating
        reviewCount
        productCategories {
          nodes {
            slug
            name
          }
        }
        ... on InventoriedProduct {
          stockStatus
          stockQuantity
        }
        ... on ProductWithAttributes {
          attributes {
            nodes {
              name
              options
              ... on GlobalProductAttribute {
                slug
              }
            }
          }
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          variations(first: 50) {
            nodes {
              id
              databaseId
              name
              price
              regularPrice
              salePrice
              image {
                sourceUrl
              }
              ... on InventoriedProduct {
                stockStatus
                stockQuantity
              }
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
        ... on ExternalProduct {
          price
          regularPrice
          salePrice
        }
      }
    }
  }
`;

export const GET_PRODUCT_BY_SLUG = /* GraphQL */ `
  query GetProduct($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      id
      databaseId
      slug
      name
      type
      shortDescription
      description
      image {
        sourceUrl
        altText
      }
      galleryImages(first: 10) {
        nodes {
          sourceUrl
        }
      }
      onSale
      featured
      averageRating
      reviewCount
      productCategories {
        nodes {
          slug
          name
        }
      }
      ... on InventoriedProduct {
        stockStatus
        stockQuantity
      }
      ... on ProductWithAttributes {
        attributes {
          nodes {
            name
            options
            ... on GlobalProductAttribute {
              slug
            }
          }
        }
      }
      ... on SimpleProduct {
        price
        regularPrice
        salePrice
      }
      ... on VariableProduct {
        price
        regularPrice
        salePrice
        variations(first: 50) {
          nodes {
            id
            databaseId
            name
            price
            regularPrice
            salePrice
            image {
              sourceUrl
            }
            ... on InventoriedProduct {
              stockStatus
              stockQuantity
            }
            attributes {
              nodes {
                name
                value
              }
            }
          }
        }
      }
      ... on ExternalProduct {
        price
        regularPrice
        salePrice
      }
      # ACF fragrance group — registered on altaha.shop (live since Task 16).
      # If this ever 400s again, the ACF field was unregistered WP-side.
      fragranceDetails {
        topNotes
        hartNotes
        sillageValue
      }
      related(first: 4, where: { orderby: { field: POPULARITY, order: DESC } }) {
        nodes {
          id
          databaseId
          slug
          name
          onSale
          image {
            sourceUrl
          }
          averageRating
          ... on InventoriedProduct {
            stockStatus
            stockQuantity
          }
          ... on SimpleProduct {
            price
            regularPrice
            salePrice
          }
          ... on VariableProduct {
            price
            regularPrice
            salePrice
          }
          ... on ExternalProduct {
            price
            regularPrice
            salePrice
          }
        }
      }
    }
  }
`;

// ── Cart (WooGraphQL server-side cart session) ──────────────────────────────

export const GET_CART = /* GraphQL */ `
  query GetCart {
    cart {
      contents {
        itemCount
        nodes {
          key
          quantity
          product {
            node {
              databaseId
              slug
              name
              image {
                sourceUrl
              }
              ... on InventoriedProduct {
                stockStatus
                stockQuantity
              }
              ... on SimpleProduct {
                price
                regularPrice
                salePrice
              }
              ... on VariableProduct {
                price
              }
              ... on ExternalProduct {
                price
              }
            }
          }
          variation {
            node {
              databaseId
              price
              regularPrice
              salePrice
              image {
                sourceUrl
              }
              ... on InventoriedProduct {
                stockStatus
                stockQuantity
              }
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
      subtotal
      shippingTotal
      total
      totalTax
    }
  }
`;

const CART_PAYLOAD = /* GraphQL */ `
  {
    contents {
      itemCount
      nodes {
        key
        quantity
        product {
          node {
            databaseId
            slug
            name
            image {
              sourceUrl
            }
            ... on InventoriedProduct {
              stockStatus
              stockQuantity
            }
            ... on SimpleProduct {
              price
              regularPrice
              salePrice
            }
            ... on VariableProduct {
              price
            }
            ... on ExternalProduct {
              price
            }
          }
        }
        variation {
          node {
            databaseId
            price
            regularPrice
            salePrice
            image {
              sourceUrl
            }
            ... on InventoriedProduct {
              stockStatus
              stockQuantity
            }
            attributes {
              nodes {
                name
                value
              }
            }
          }
        }
      }
    }
    subtotal
    shippingTotal
    total
    totalTax
  }
`;

export const ADD_TO_CART = /* GraphQL */ `
  mutation AddToCart($productId: Int!, $variationId: Int, $quantity: Int, $variation: [ProductAttributeInput]) {
    addToCart(
      input: { productId: $productId, variationId: $variationId, quantity: $quantity, variation: $variation }
    ) {
      cart ${CART_PAYLOAD}
    }
  }
`;

export const UPDATE_CART_QUANTITIES = /* GraphQL */ `
  mutation UpdateCartQuantities($key: ID!, $quantity: Int!) {
    updateItemQuantities(input: { items: [{ key: $key, quantity: $quantity }] }) {
      cart ${CART_PAYLOAD}
    }
  }
`;

export const REMOVE_ITEMS_FROM_CART = /* GraphQL */ `
  mutation RemoveItemsFromCart($keys: [ID!]!) {
    removeItemsFromCart(input: { keys: $keys }) {
      cart ${CART_PAYLOAD}
    }
  }
`;

// ── Checkout ────────────────────────────────────────────────────────────────

export const CHECKOUT = /* GraphQL */ `
  mutation Checkout($input: CheckoutInput!) {
    checkout(input: $input) {
      order {
        databaseId
        orderNumber
        total
        status
      }
      result
      redirect
    }
  }
`;
