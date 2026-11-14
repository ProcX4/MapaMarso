import { Fragment } from 'react'
import { LAYERS, GROUPS, OTHER_SOURCES, type DataSource } from '../../map/layers/registry'
import { PlaceholderTag, ProvenanceTag } from '../../components/ProvenanceTag'

const FIELDS: [keyof DataSource['provenance'], string][] = [
  ['instrument', 'Instrument'],
  ['mission', 'Mission'],
  ['product', 'Product'],
  ['resolution', 'Resolution'],
  ['derivedFrom', 'Derived from'],
  ['producer', 'Producer'],
  ['dates', 'Dates'],
  ['credit', 'Credit'],
  ['licence', 'Licence'],
]

/** Provenance for every layer, straight from the registry, then the sources that aren't map layers. */
export function DataSourceList() {
  const sources: DataSource[] = [...LAYERS, ...OTHER_SOURCES]
  return (
    <div className="about-sources">
      {GROUPS.map((g) => (
        <section key={g.id}>
          <h3 className="kicker">{g.label}</h3>
          <ul>
            {sources.filter((l) => l.group === g.id).map((l) => (
              <li key={l.id} className="panel about-source">
                <div className="about-source-head">
                  <span>{l.name}</span>
                  <ProvenanceTag category={l.category} />
                  {l.placeholder && <PlaceholderTag note={l.placeholder} />}
                </div>
                <dl className="facts">
                  {FIELDS.map(([key, label]) => l.provenance[key] && (
                    <Fragment key={key}>
                      <dt>{label}</dt>
                      <dd>{l.provenance[key]}</dd>
                    </Fragment>
                  ))}
                  {l.coverage && (<><dt>Coverage</dt><dd>{l.coverage.note}</dd></>)}
                  {l.provenance.url && (
                    <>
                      <dt>Source</dt>
                      <dd><a href={l.provenance.url} target="_blank" rel="noreferrer">{new URL(l.provenance.url).host}</a></dd>
                    </>
                  )}
                </dl>
                {l.placeholder && <p className="muted about-placeholder">{l.placeholder}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
