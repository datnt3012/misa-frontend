import { OrderTag as ApiOrderTag } from '@/api/orderTags.api';

export const normalizeTagLabel = (value?: string | null): string =>
  value?.toString().trim().toLowerCase() || '';

export const RECONCILED_TAG_NAMES = ['đã đối soát', 'reconciled'];
export const PENDING_TAG_NAMES = ['chưa đối soát', 'pending reconciliation'];

export const tagMatchesNames = (tag: ApiOrderTag, names: string[]): boolean => {
  const targets = names.map(normalizeTagLabel);
  return [tag.name, tag.raw_name, tag.display_name].some((c) =>
    targets.includes(normalizeTagLabel(c))
  );
};

export const isReconciledDisplayTag = (tag: ApiOrderTag): boolean =>
  tagMatchesNames(tag, RECONCILED_TAG_NAMES);

export const isPendingDisplayTag = (tag: ApiOrderTag): boolean =>
  tagMatchesNames(tag, PENDING_TAG_NAMES);

export const getTagDisplayName = (tag: ApiOrderTag): string =>
  tag.display_name || tag.name || tag.raw_name || tag.id;

export const mapTagNames = (
  tagNames: string[] | undefined,
  availableTags: ApiOrderTag[]
): ApiOrderTag[] => {
  if (!Array.isArray(tagNames)) return [];
  return tagNames
    .map((tagName): ApiOrderTag | null => {
      if (!tagName) return null;
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagName);
      if (isUUID) {
        return (
          availableTags.find((t) => t.id === tagName) ?? {
            id: tagName,
            name: tagName,
            display_name: tagName,
            raw_name: tagName,
            color: '#94a3b8',
          }
        );
      }
      return (
        availableTags.find((t) => tagMatchesNames(t, [tagName])) ?? {
          id: `tag_${normalizeTagLabel(tagName) || Date.now()}`,
          name: tagName,
          display_name: tagName,
          raw_name: tagName,
          color: '#94a3b8',
        }
      );
    })
    .filter(Boolean) as ApiOrderTag[];
};
