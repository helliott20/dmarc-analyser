/**
 * Schema Markup Component for JSON-LD structured data
 */

export interface SchemaMarkupProps {
  schema: Record<string, any>;
}

/**
 * Render JSON-LD schema markup as a script tag
 * Usage: <SchemaMarkup schema={getOrganizationSchema()} />
 */
export function SchemaMarkup({ schema }: SchemaMarkupProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  );
}

/**
 * Multiple schema markup for a page
 */
export function MultipleSchemaMarkup({ schemas }: { schemas: Record<string, any>[] }) {
  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          suppressHydrationWarning
        />
      ))}
    </>
  );
}
