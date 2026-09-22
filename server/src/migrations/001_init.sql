-- PFloodLite: anonymous contributions, no accounts or moderation.
CREATE TABLE markers (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  kind                  TEXT NOT NULL DEFAULT 'flood' CHECK (kind IN ('flood', 'geodetic')),
  contributor_name      TEXT,  -- optional, self-reported; shown as "Anonymous" when empty

  -- The marker itself
  title                 TEXT NOT NULL,
  marker_type           TEXT CHECK (marker_type IN ('plaque', 'carved_line', 'painted_line', 'post', 'stone', 'building_mark', 'gauge', 'other')),
  inscription           TEXT,
  condition             TEXT CHECK (condition IN ('good', 'worn', 'damaged', 'destroyed', 'unknown')),
  photo_path            TEXT,
  notes                 TEXT,

  -- Location (WGS84)
  latitude              REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude             REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  location_source       TEXT NOT NULL CHECK (location_source IN ('map', 'manual', 'geotag', 'gps')),
  location_accuracy_m   REAL CHECK (location_accuracy_m >= 0),
  locality              TEXT,
  country               TEXT,
  waterbody             TEXT,  -- river / lake / coast the water came from

  -- Heights (metres)
  height_above_ground_m REAL,  -- flood line above current ground level
  ground_elevation_m    REAL,  -- ground level above sea level at the marker
  vertical_datum        TEXT,  -- e.g. NAVD88, EGM96, local
  flood_elevation_m     REAL GENERATED ALWAYS AS (ground_elevation_m + height_above_ground_m) VIRTUAL,

  -- Flood event
  flood_date            TEXT,  -- ISO 8601, may be partial: 1927, 1927-04, 1927-04-21
  event_name            TEXT,  -- e.g. Hurricane Ida
  flood_type            TEXT CHECK (flood_type IN ('riverine', 'coastal', 'storm_surge', 'flash', 'pluvial', 'dam_failure', 'tsunami', 'glacial', 'other')),
  cause                 TEXT,

  -- Geodetic-only fields (NULL for flood markers)
  designation           TEXT,  -- station name, e.g. "PRINCETON RM 2"
  pid                   TEXT,  -- permanent identifier, e.g. NGS PID "KV1234"
  agency                TEXT,  -- e.g. NGS, USGS, USC&GS, Ordnance Survey
  monument_type         TEXT CHECK (monument_type IN (
                          'benchmark_disk', 'triangulation_disk', 'reference_mark_disk', 'azimuth_mark_disk', 'traverse_disk',
                          'gnss_station', 'bolt_rivet', 'chiseled_mark', 'rod_pipe', 'other')),
  setting               TEXT CHECK (setting IN ('bedrock', 'boulder', 'concrete_monument', 'structure', 'sidewalk_curb', 'rod_pipe', 'other')),
  stamping              TEXT,  -- text stamped on the disk
  year_set              INTEGER CHECK (year_set BETWEEN 1700 AND 2200),
  orthometric_height_m  REAL,  -- published elevation of the mark
  horizontal_datum      TEXT,  -- e.g. NAD83(2011), WGS84

  -- Provenance
  source_reference      TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Map views: filter by bounding box (and optionally kind) and pick the newest rows from the index alone.
CREATE INDEX idx_markers_lat_lng_created ON markers (latitude, longitude, created_at);
CREATE INDEX idx_markers_kind_lat_lng_created ON markers (kind, latitude, longitude, created_at);
CREATE INDEX idx_markers_created ON markers (created_at);

-- Full-text search over marker text. The trigram tokenizer keeps substring matching
-- (like LIKE '%text%') but uses an index. Text is stored once in `markers`, kept in sync by triggers.
CREATE VIRTUAL TABLE markers_fts USING fts5(
  title, notes, inscription, locality, country, waterbody, event_name, designation, pid, stamping, agency, contributor_name,
  content = 'markers', content_rowid = 'id', tokenize = 'trigram'
);

CREATE TRIGGER markers_fts_insert AFTER INSERT ON markers BEGIN
  INSERT INTO markers_fts (rowid, title, notes, inscription, locality, country, waterbody, event_name, designation, pid, stamping, agency, contributor_name)
  VALUES (new.id, new.title, new.notes, new.inscription, new.locality, new.country, new.waterbody, new.event_name, new.designation, new.pid, new.stamping, new.agency, new.contributor_name);
END;

CREATE TRIGGER markers_fts_delete AFTER DELETE ON markers BEGIN
  INSERT INTO markers_fts (markers_fts, rowid, title, notes, inscription, locality, country, waterbody, event_name, designation, pid, stamping, agency, contributor_name)
  VALUES ('delete', old.id, old.title, old.notes, old.inscription, old.locality, old.country, old.waterbody, old.event_name, old.designation, old.pid, old.stamping, old.agency, old.contributor_name);
END;
