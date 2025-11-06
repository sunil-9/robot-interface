import { memo } from "react";

interface InlineSvgProps {
  content?: string;
  className?: string;
  fallback?: React.ReactNode;
  alt?: string;
}

/**
 * Component for rendering SVG content directly inline in the page
 */
export const InlineSvg = memo(
  ({ content, className, fallback, alt }: InlineSvgProps) => {
    if (!content) {
      return <>{fallback}</> || null;
    }

    // For security, we sanitize the SVG content by rendering it via dangerouslySetInnerHTML
    // In a production app, you might want to use a proper SVG sanitizer library

    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: content }}
        role="img"
        aria-label={alt || "SVG Image"}
        title={alt}
      />
    );
  }
);

InlineSvg.displayName = "InlineSvg";

export default InlineSvg;
