import type {
  RequirementItem,
  RequirementLink,
  RequirementLinkType,
} from "../domain/types";
import { getLabel } from "../domain/projectHelpers";

type Props = {
  selectedItem: RequirementItem;
  allItems: RequirementItem[];
  links: RequirementLink[];
  onAddLink: (type: RequirementLinkType, sourceId: string, targetId: string) => void;
  onRemoveLink: (linkId: string) => void;
};

type SectionProps = {
  title: string;
  options: RequirementItem[];
  linkedIds: Set<string>;
  getLinkId: (id: string) => string | undefined;
  onToggle: (item: RequirementItem, linked: boolean, linkId: string | undefined) => void;
};

function LinkSection({ title, options, linkedIds, getLinkId, onToggle }: SectionProps) {
  if (options.length === 0) return null;
  return (
    <div className="link-section">
      <div className="link-section-title">{title}</div>
      {options.map((opt) => {
        const linked = linkedIds.has(opt.id);
        const linkId = getLinkId(opt.id);
        const label = getLabel(opt);
        return (
          <label key={opt.id} className="link-option">
            <input
              type="checkbox"
              checked={linked}
              onChange={() => onToggle(opt, linked, linkId)}
              aria-label={`Link to ${label}`}
            />
            <span className="link-option-label">{label}</span>
            <span className="link-option-content" title={opt.content}>
              {opt.content}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function LinkEditor({ selectedItem, allItems, links, onAddLink, onRemoveLink }: Props) {
  const { type, id } = selectedItem;

  if (type === "UR") {
    const srs = allItems.filter((i) => i.type === "SR");
    const linkedSrIds = new Set(
      links.reduce<string[]>((acc, l) => { if (l.type === "UR_TO_SR" && l.sourceId === id) acc.push(l.targetId); return acc; }, [])
    );
    return (
      <LinkSection
        title="Link to SR"
        options={srs}
        linkedIds={linkedSrIds}
        getLinkId={(srId) =>
          links.find((l) => l.type === "UR_TO_SR" && l.sourceId === id && l.targetId === srId)?.id
        }
        onToggle={(sr, linked, linkId) => {
          if (linked && linkId) onRemoveLink(linkId);
          else onAddLink("UR_TO_SR", id, sr.id);
        }}
      />
    );
  }

  if (type === "SR") {
    const urs = allItems.filter((i) => i.type === "UR");
    const features = allItems.filter((i) => i.type === "FEATURE");
    const linkedUrIds = new Set(
      links.reduce<string[]>((acc, l) => { if (l.type === "UR_TO_SR" && l.targetId === id) acc.push(l.sourceId); return acc; }, [])
    );
    const linkedFtIds = new Set(
      links.reduce<string[]>((acc, l) => { if (l.type === "SR_TO_FEATURE" && l.sourceId === id) acc.push(l.targetId); return acc; }, [])
    );
    return (
      <>
        <LinkSection
          title="Linked from UR"
          options={urs}
          linkedIds={linkedUrIds}
          getLinkId={(urId) =>
            links.find((l) => l.type === "UR_TO_SR" && l.sourceId === urId && l.targetId === id)?.id
          }
          onToggle={(ur, linked, linkId) => {
            if (linked && linkId) onRemoveLink(linkId);
            else onAddLink("UR_TO_SR", ur.id, id);
          }}
        />
        <LinkSection
          title="Link to Feature"
          options={features}
          linkedIds={linkedFtIds}
          getLinkId={(ftId) =>
            links.find((l) => l.type === "SR_TO_FEATURE" && l.sourceId === id && l.targetId === ftId)
              ?.id
          }
          onToggle={(ft, linked, linkId) => {
            if (linked && linkId) onRemoveLink(linkId);
            else onAddLink("SR_TO_FEATURE", id, ft.id);
          }}
        />
      </>
    );
  }

  // FEATURE
  const srs = allItems.filter((i) => i.type === "SR");
  const linkedSrIds = new Set(
    links.reduce<string[]>((acc, l) => { if (l.type === "SR_TO_FEATURE" && l.targetId === id) acc.push(l.sourceId); return acc; }, [])
  );
  return (
    <LinkSection
      title="Linked from SR"
      options={srs}
      linkedIds={linkedSrIds}
      getLinkId={(srId) =>
        links.find((l) => l.type === "SR_TO_FEATURE" && l.sourceId === srId && l.targetId === id)?.id
      }
      onToggle={(sr, linked, linkId) => {
        if (linked && linkId) onRemoveLink(linkId);
        else onAddLink("SR_TO_FEATURE", sr.id, id);
      }}
    />
  );
}
