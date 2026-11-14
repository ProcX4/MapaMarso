import { LAYERS, GROUPS } from '../../map/layers/registry'
import { PlaceholderTag, ProvenanceTag } from '../../components/ProvenanceTag'

/** Provenance for every layer, straight from the registry. */
export function DataSourceList() {
  return (
    <div className="about-sources">
      {GROUPS.map((g) => (
        <section key={g.id}>
          <h3 className="kicker">{g.label}</h3>
          <ul>
            {LAYERS.filter((l) => l.group === g.id).map((l) => (
              <li key={l.id} className="panel about-source">
                <div className="about-source-head">
                  <span>{l.name}</span>
                  <ProvenanceTag category={l.category} />
                  {l.placeholder && <PlaceholderTag note={l.placeholder} />}
                </div>
                <dl className="facts">
                  {l.provenance.instrument && (<><dt>Instrument</dt><dd>{l.provenance.instrument}</dd></>)}
                  {l.provenance.mission && (<><dt>Mission</dt><dd>{l.provenance.mission}</dd></>)}
                  {l.provenance.product && (<><dt>Product</dt><dd>{l.provenance.product}</dd></>)}
                  {l.provenance.resolution && (<><dt>Resolution</dt><dd>{l.provenance.resolution}</dd></>)}
                  {l.provenance.derivedFrom && (<><dt>Derived from</dt><dd>{l.provenance.derivedFrom}</dd></>)}
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
