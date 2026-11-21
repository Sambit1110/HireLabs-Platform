'use client';

import React from 'react';

export function FeaturesGrid() {
  const features = [
    {
      number: '01',
      eyebrow: 'UNDERSTANDING',
      title: 'Meaning, not just keywords.',
      description:
        'Gemini embeddings capture technical skills, seniority, and cross-domain experience so candidate discovery is based on meaning rather than simple keyword overlap.',
      tags: ['Gemini Embeddings', '1536 Dimensions'],
      featured: true,
      visual: 'embedding',
    },
    {
      number: '02',
      eyebrow: 'SEARCH',
      title: 'Search candidates at database speed.',
      description:
        'Native Postgres cosine-distance queries with pgvector and HNSW indexing keep semantic candidate search fast without maintaining a separate vector database.',
      tags: ['pgvector', 'HNSW', '<85ms'],
      visual: 'search',
    },
    {
      number: '03',
      eyebrow: 'SECURITY',
      title: 'Every team sees its own data.',
      description:
        'Candidate records, vectors, and files are scoped to the authenticated user through Supabase Row Level Security.',
      tags: ['RLS', 'Private Storage'],
      visual: 'security',
    },
    {
      number: '04',
      eyebrow: 'INGESTION',
      title: 'Messy resumes become structured data.',
      description:
        'PDF and DOCX files are transformed into consistent candidate profiles and normalized JSON.',
      tags: ['PDF', 'DOCX', 'JSON'],
      visual: 'document',
    },
    {
      number: '05',
      eyebrow: 'EXPLAINABILITY',
      title: 'Know why the candidate ranked.',
      description:
        'Match explanations stay grounded in supplied evidence, highlight qualification gaps, and avoid using protected demographic traits.',
      tags: ['Evidence', 'Gap Analysis'],
      visual: 'explain',
    },
    {
      number: '06',
      eyebrow: 'APPLICATION',
      title: 'A modern stack underneath.',
      description:
        'Built around Next.js App Router, authenticated routes, server-side rendering, and cloud-ready deployment primitives.',
      tags: ['Next.js 15', 'Vercel Ready'],
      visual: 'stack',
    },
  ];

  const renderVisual = (type) => {
    if (type === 'embedding') {
      return (
        <div className="hl-feature-visual hl-embedding-visual">
          <div className="hl-embedding-header">
            <span>Candidate representation</span>
            <span>1536 DIM</span>
          </div>

          <div
            className="hl-vector-grid"
            aria-hidden="true"
          >
            {Array.from({ length: 72 }).map((_, index) => {
              const scale =
                0.55 +
                ((index * 17) % 46) / 100;

              const opacity =
                0.35 +
                ((index * 13) % 60) / 100;

              return (
                <span
                  key={index}
                  className="hl-vector-cell"
                  style={{
                    '--vector-scale': scale,
                    '--vector-opacity': opacity,
                  }}
                />
              );
            })}
          </div>

          <div className="hl-embedding-bottom">
            <div>
              <strong>Semantic</strong>
              <span>meaning retained</span>
            </div>

            <div>
              <strong>Searchable</strong>
              <span>vector signal</span>
            </div>

            <div>
              <strong>Private</strong>
              <span>team scoped</span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'search') {
      return (
        <div className="hl-feature-visual hl-search-visual">
          <div className="hl-search-query">
            Senior Full-Stack AI Engineer
          </div>

          <div className="hl-search-results">
            <div className="hl-search-row top">
              <span className="hl-search-rank">
                01
              </span>

              <div>
                <strong>Alex Mercer</strong>
                <span>
                  Lead Full-Stack AI Engineer
                </span>
              </div>

              <b>97.4%</b>
            </div>

            <div className="hl-search-row">
              <span className="hl-search-rank">
                02
              </span>

              <div>
                <strong>Dr. Sarah Lin</strong>
                <span>
                  Staff ML &amp; Vector Systems
                  Engineer
                </span>
              </div>

              <b>84.7%</b>
            </div>

            <div className="hl-search-row">
              <span className="hl-search-rank">
                03
              </span>

              <div>
                <strong>Elena Rostova</strong>
                <span>
                  Principal Cloud Architect
                </span>
              </div>

              <b>71.2%</b>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'security') {
      return (
        <div className="hl-feature-visual hl-feature-security-visual">
          <div className="hl-security-lock">
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="10"
                width="16"
                height="10"
                rx="2"
              />

              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>

          <div className="hl-security-copy">
            <strong>auth.uid()</strong>
            <span>
              controls the data boundary
            </span>
          </div>

          <div className="hl-security-lines">
            <div className="allowed">
              <span>✓</span>
              Authorized candidate records
            </div>

            <div className="blocked">
              <span>×</span>
              Another team's private vectors
            </div>

            <div className="blocked">
              <span>×</span>
              Unscoped resume storage
            </div>
          </div>
        </div>
      );
    }

    if (type === 'document') {
      return (
        <div className="hl-feature-visual hl-document-visual">
          <div className="hl-document-paper">
            <div className="hl-paper-heading" />
            <div />
            <div />
            <div className="short" />
            <div />
            <div className="short" />
          </div>

          <div className="hl-document-arrow">
            →
          </div>

          <div className="hl-document-profile">
            <span>PROFILE</span>

            <strong>Alex Mercer</strong>

            <div className="hl-profile-tags">
              <i>React</i>
              <i>Node.js</i>
              <i>AI / ML</i>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'explain') {
      return (
        <div className="hl-feature-visual hl-explain-visual">
          <div className="hl-explain-score">
            <span>97.4%</span>
            <small>match</small>
          </div>

          <div className="hl-explain-items">
            <div>
              <span>✓</span>
              Next.js experience
            </div>

            <div>
              <span>✓</span>
              PostgreSQL + pgvector
            </div>

            <div>
              <span>✓</span>
              AI / ML background
            </div>

            <div className="gap">
              <span>!</span>
              Kubernetes gap
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="hl-feature-visual hl-stack-visual">
        <div className="hl-stack-layer">
          <span>Frontend</span>
          <strong>Next.js 15</strong>
        </div>

        <div className="hl-stack-layer">
          <span>Data + Auth</span>
          <strong>Supabase</strong>
        </div>

        <div className="hl-stack-layer">
          <span>Search</span>
          <strong>pgvector</strong>
        </div>
      </div>
    );
  };

  return (
    <section
      className="hl-features-section"
      id="features"
    >
      <style>{`

        /* =====================================================
           ROOT
           ===================================================== */

        .hl-features-section {
          --cream: #F5F1E8;
          --cream-soft: #ECE6DA;
          --white: #FFFFFF;

          --espresso: #211C18;
          --espresso-soft: #645B52;

          --olive: #6F7D55;
          --olive-dark: #596544;

          --taupe: #C8C0AF;
          --border: #DED7CA;

          position: relative;

          padding:
            160px 0;

          background:
            var(--cream);

          color:
            var(--espresso);

          overflow:
            hidden;

          isolation:
            isolate;
        }


        .hl-features-section *,
        .hl-features-section
          *::before,
        .hl-features-section
          *::after {
          box-sizing:
            border-box;
        }


        /* =====================================================
           BACKGROUND DETAIL
           ===================================================== */

        .hl-features-section::before {
          content:
            '';

          position:
            absolute;

          width:
            min(
              850px,
              76vw
            );

          height:
            min(
              850px,
              76vw
            );

          right:
            -400px;

          top:
            18%;

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.065
            );

          border-radius:
            50%;

          pointer-events:
            none;

          z-index:
            0;
        }


        .hl-features-section::after {
          content:
            '';

          position:
            absolute;

          width:
            420px;

          height:
            420px;

          left:
            -300px;

          bottom:
            10%;

          border:
            1px dashed
            rgba(
              111,
              125,
              85,
              0.055
            );

          border-radius:
            50%;

          pointer-events:
            none;

          z-index:
            0;
        }


        /* =====================================================
           SHELL
           ===================================================== */

        .hl-features-shell {
          position:
            relative;

          z-index:
            2;

          width:
            min(
              1180px,
              calc(100% - 48px)
            );

          margin:
            0 auto;
        }


        /* =====================================================
           HEADING
           ===================================================== */

        .hl-features-heading {
          display:
            grid;

          grid-template-columns:
            0.8fr
            1.2fr;

          gap:
            70px;

          align-items:
            end;

          margin-bottom:
            75px;
        }


        .hl-features-kicker {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            9px;

          margin-bottom:
            17px;

          color:
            var(--olive-dark);

          font-size:
            10px;

          line-height:
            1;

          font-weight:
            900;

          letter-spacing:
            0.15em;

          text-transform:
            uppercase;
        }


        .hl-features-kicker-dot {
          width:
            7px;

          height:
            7px;

          flex:
            0 0 7px;

          border-radius:
            50%;

          background:
            var(--olive);

          box-shadow:
            0 0 0 4px
            rgba(
              111,
              125,
              85,
              0.11
            );
        }


        .hl-features-title {
          margin:
            0;

          max-width:
            520px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            clamp(
              48px,
              5.8vw,
              76px
            );

          line-height:
            0.95;

          letter-spacing:
            -0.055em;

          font-weight:
            500;
        }


        .hl-features-title em {
          color:
            var(--olive);

          font-style:
            italic;
        }


        .hl-features-intro {
          max-width:
            590px;

          margin:
            0 0 3px
            auto;

          color:
            var(--espresso-soft);

          font-size:
            15px;

          line-height:
            1.75;
        }


        /* =====================================================
           CARD GRID
           ===================================================== */

        .hl-feature-grid {
          display:
            grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );

          gap:
            14px;

          align-items:
            start;
        }


        /* =====================================================
           STANDARD CARD

           IMPORTANT:
           Normal cards now use an internal two-column layout.
           This is what removes the massive vertical empty space
           visible in cards 02 and 03.
           ===================================================== */

        .hl-feature-card {
          position:
            relative;

          min-height:
            0;

          height:
            auto;

          align-self:
            start;

          display:
            grid;

          grid-template-columns:
            minmax(
              0,
              1.02fr
            )
            minmax(
              210px,
              0.98fr
            );

          gap:
            24px;

          align-items:
            center;

          padding:
            26px;

          border:
            1px solid
            var(--border);

          border-radius:
            25px;

          background:
            rgba(
              255,
              255,
              255,
              0.54
            );

          overflow:
            hidden;

          transition:
            transform 240ms ease,
            box-shadow 240ms ease,
            background 240ms ease;
        }


        .hl-feature-card:hover {
          transform:
            translateY(
              -4px
            );

          background:
            rgba(
              255,
              255,
              255,
              0.72
            );

          box-shadow:
            0 22px 55px
            rgba(
              45,
              40,
              34,
              0.08
            );
        }


        /* =====================================================
           FEATURED CARD
           ===================================================== */

        .hl-feature-card.featured {
          grid-column:
            span 2;

          min-height:
            510px;

          height:
            auto;

          align-self:
            start;

          display:
            grid;

          grid-template-columns:
            0.85fr
            1.15fr;

          gap:
            50px;

          align-items:
            center;

          padding:
            36px;

          background:
            var(--white);

          box-shadow:
            0 25px 70px
            rgba(
              45,
              40,
              34,
              0.07
            );
        }


        .hl-feature-card.featured:hover {
          background:
            #FFFFFF;
        }


        .hl-feature-card.featured::before {
          content:
            '';

          position:
            absolute;

          width:
            420px;

          height:
            420px;

          right:
            -210px;

          top:
            -210px;

          border-radius:
            50%;

          background:
            radial-gradient(
              circle,
              rgba(
                111,
                125,
                85,
                0.07
              ),
              transparent
                68%
            );

          pointer-events:
            none;
        }


        /* =====================================================
           CARD CONTENT
           ===================================================== */

        .hl-feature-number {
          color:
            #A0988D;

          font-size:
            9px;

          font-weight:
            900;

          letter-spacing:
            0.14em;
        }


        .hl-feature-eyebrow {
          display:
            block;

          margin-top:
            18px;

          color:
            var(--olive-dark);

          font-size:
            8px;

          font-weight:
            900;

          letter-spacing:
            0.13em;

          text-transform:
            uppercase;
        }


        .hl-feature-title {
          margin:
            9px 0 0;

          max-width:
            460px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            clamp(
              28px,
              3vw,
              42px
            );

          line-height:
            1;

          letter-spacing:
            -0.04em;

          font-weight:
            500;
        }


        .hl-feature-card:not(
          .featured
        )
          .hl-feature-title {
          font-size:
            28px;
        }


        .hl-feature-description {
          max-width:
            500px;

          margin:
            17px 0 0;

          color:
            #736A61;

          font-size:
            11px;

          line-height:
            1.7;
        }


        .hl-feature-tags {
          display:
            flex;

          flex-wrap:
            wrap;

          gap:
            7px;

          margin-top:
            18px;
        }


        .hl-feature-tag {
          padding:
            7px 9px;

          border:
            1px solid
            var(--border);

          border-radius:
            999px;

          background:
            #F8F5EF;

          color:
            #756C63;

          font-size:
            8px;

          line-height:
            1;

          font-weight:
            800;
        }


        .hl-feature-index {
          position:
            absolute;

          right:
            20px;

          top:
            20px;

          color:
            #C1BAAE;

          font-size:
            8px;

          font-weight:
            900;
        }


        /* =====================================================
           VISUAL CONTAINER
           ===================================================== */

        .hl-feature-visual {
          min-height:
            185px;

          width:
            100%;

          border:
            1px solid
            var(--border);

          border-radius:
            18px;

          background:
            #FAF8F3;

          overflow:
            hidden;
        }


        /* =====================================================
           EMBEDDING
           ===================================================== */

        .hl-embedding-visual {
          padding:
            21px;
        }


        .hl-embedding-header {
          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;

          gap:
            15px;

          padding-bottom:
            14px;

          color:
            #766D64;

          border-bottom:
            1px solid
            #E7E0D4;

          font-size:
            8px;

          line-height:
            1;

          font-weight:
            900;

          letter-spacing:
            0.08em;

          text-transform:
            uppercase;
        }


        .hl-embedding-header
          span:last-child {
          color:
            var(--olive-dark);
        }


        .hl-vector-grid {
          display:
            grid;

          grid-template-columns:
            repeat(
              18,
              minmax(
                0,
                1fr
              )
            );

          grid-template-rows:
            repeat(
              4,
              16px
            );

          align-items:
            center;

          gap:
            5px;

          width:
            100%;

          height:
            98px;

          padding:
            10px 0;

          overflow:
            hidden;
        }


        .hl-vector-grid span {
          display:
            block;

          width:
            100%;

          height:
            16px;

          min-height:
            16px;

          max-height:
            16px;

          border-radius:
            999px;

          background:
            var(--olive);

          opacity:
            var(
              --vector-opacity,
              0.65
            );

          transform:
            scaleY(
              var(
                --vector-scale,
                0.8
              )
            );

          transform-origin:
            center;

          animation:
            hlFeaturePulse
            3s
            ease-in-out
            infinite;

          will-change:
            transform;
        }


        .hl-vector-grid
          span:nth-child(
            3n
          ) {
          animation-delay:
            150ms;
        }


        .hl-vector-grid
          span:nth-child(
            5n
          ) {
          animation-delay:
            300ms;
        }


        @keyframes hlFeaturePulse {

          0%,
          100% {
            transform:
              scaleY(
                calc(
                  var(
                    --vector-scale,
                    0.8
                  ) * 0.82
                )
              );
          }

          50% {
            transform:
              scaleY(
                var(
                  --vector-scale,
                  0.8
                )
              );
          }

        }


        .hl-embedding-bottom {
          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap:
            8px;

          margin-top:
            7px;
        }


        .hl-embedding-bottom div {
          min-width:
            0;

          padding:
            11px;

          border-radius:
            11px;

          background:
            #F0EDE5;

          overflow:
            hidden;
        }


        .hl-embedding-bottom strong {
          display:
            block;

          font-size:
            9px;

          line-height:
            1.1;
        }


        .hl-embedding-bottom span {
          display:
            block;

          margin-top:
            4px;

          color:
            #857C73;

          font-size:
            7px;

          line-height:
            1.2;
        }


        /* =====================================================
           SEARCH
           ===================================================== */

        .hl-search-visual {
          padding:
            17px;
        }


        .hl-search-query {
          padding:
            12px;

          border-radius:
            11px;

          background:
            var(--espresso);

          color:
            var(--cream);

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            14px;

          line-height:
            1.2;
        }


        .hl-search-results {
          display:
            grid;

          gap:
            6px;

          margin-top:
            10px;
        }


        .hl-search-row {
          display:
            grid;

          grid-template-columns:
            28px
            minmax(
              0,
              1fr
            )
            auto;

          align-items:
            center;

          gap:
            9px;

          padding:
            8px;

          border:
            1px solid
            #E3DDD1;

          border-radius:
            10px;

          transition:
            transform 200ms ease,
            background 200ms ease,
            border-color 200ms ease;
        }


        .hl-search-row:hover {
          transform:
            translateX(
              3px
            );

          background:
            #FCFBF7;

          border-color:
            rgba(
              111,
              125,
              85,
              0.25
            );
        }


        .hl-search-row.top {
          border-color:
            rgba(
              111,
              125,
              85,
              0.38
            );

          background:
            #F0F3E9;
        }


        .hl-search-rank {
          width:
            25px;

          height:
            25px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            7px;

          background:
            #EEEAE1;

          color:
            #736A61;

          font-size:
            7px;

          font-weight:
            900;
        }


        .hl-search-row.top
          .hl-search-rank {
          background:
            #E4EADA;

          color:
            var(--olive-dark);
        }


        .hl-search-row
          strong {
          display:
            block;

          font-size:
            8px;
        }


        .hl-search-row
          span:not(
            .hl-search-rank
          ) {
          display:
            block;

          margin-top:
            2px;

          color:
            #877E74;

          font-size:
            7px;

          line-height:
            1.25;
        }


        .hl-search-row b {
          color:
            var(--olive-dark);

          font-size:
            9px;
        }


        /* =====================================================
           SECURITY
           ===================================================== */

        .hl-feature-security-visual {
          width:
          100%;

          min-height:
          185px;

          padding:
          21px;

          border:
          1px solid
          var(--border);

          border-radius:
          18px;

          background:
         #FAF8F3;

          overflow:
          hidden;
        }


        .hl-security-lock {
          width:
            45px;

          height:
            45px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            13px;

          background:
            var(--espresso);

          color:
            var(--cream);

          box-shadow:
            0 12px 25px
            rgba(
              33,
              28,
              24,
              0.08
            );
        }


        .hl-security-copy {
          margin-top:
            13px;
        }


        .hl-security-copy strong {
          display:
            block;

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;

          font-size:
            11px;
        }


        .hl-security-copy span {
          display:
            block;

          margin-top:
            3px;

          color:
            #847B72;

          font-size:
            8px;
        }


        .hl-security-lines {
          display:
            grid;

          gap:
            6px;

          margin-top:
            15px;
        }


        .hl-security-lines div {
          display:
            flex;

          align-items:
            center;

          gap:
            7px;

          padding:
            8px;

          border-radius:
            9px;

          font-size:
            8px;

          line-height:
            1.35;

          font-weight:
            700;

          transition:
            transform 200ms ease;
        }


        .hl-security-lines div:hover {
          transform:
            translateX(
              3px
            );
        }


        .hl-security-lines
          .allowed {
          background:
            #EAF0E1;

          color:
            var(--olive-dark);
        }


        .hl-security-lines
          .blocked {
          background:
            #F2EBE5;

          color:
            #886C5A;
        }


        .hl-security-lines
          span {
          font-weight:
            900;
        }


        /* =====================================================
           DOCUMENT
           ===================================================== */

        .hl-document-visual {
          display:
            grid;

          grid-template-columns:
            0.8fr
            auto
            1fr;

          align-items:
            center;

          gap:
            13px;

          padding:
            18px;
        }


        .hl-document-paper {
          min-height:
            150px;

          padding:
            14px;

          border:
            1px solid
            #DDD6CA;

          border-radius:
            12px;

          background:
            #FFFFFF;

          box-shadow:
            0 10px 20px
            rgba(
              45,
              40,
              34,
              0.04
            );
        }


        .hl-document-paper div {
          height:
            7px;

          margin:
            8px 0;

          border-radius:
            999px;

          background:
            #E7E2D8;
        }


        .hl-document-paper
          div.short {
          width:
            61%;
        }


        .hl-paper-heading {
          height:
            13px !important;

          width:
            80%;

          margin-top:
            0 !important;

          background:
            #D6CEC0 !important;
        }


        .hl-document-arrow {
          color:
            var(--olive);

          font-size:
            18px;

          font-weight:
            900;

          animation:
            hlFeatureArrow
            2.5s
            ease-in-out
            infinite;
        }


        @keyframes hlFeatureArrow {

          0%,
          100% {
            transform:
              translateX(
                0
              );
          }

          50% {
            transform:
              translateX(
                4px
              );
          }

        }


        .hl-document-profile {
          min-height:
            150px;

          padding:
            16px;

          border-radius:
            12px;

          background:
            #EEF1E6;
        }


        .hl-document-profile
          > span {
          color:
            #81786D;

          font-size:
            7px;

          letter-spacing:
            0.12em;

          font-weight:
            900;
        }


        .hl-document-profile
          strong {
          display:
            block;

          margin-top:
            11px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            17px;

          font-weight:
            500;
        }


        .hl-profile-tags {
          display:
            flex;

          flex-wrap:
            wrap;

          gap:
            4px;

          margin-top:
            13px;
        }


        .hl-profile-tags i {
          padding:
            6px 7px;

          border-radius:
            999px;

          background:
            rgba(
              111,
              125,
              85,
              0.13
            );

          color:
            var(--olive-dark);

          font-size:
            7px;

          font-style:
            normal;

          font-weight:
            800;
        }


        /* =====================================================
           EXPLAIN
           ===================================================== */

        .hl-explain-visual {
          padding:
            17px;
        }


        .hl-explain-score {
          display:
            flex;

          align-items:
            baseline;

          gap:
            8px;
        }


        .hl-explain-score span {
          color:
            var(--olive-dark);

          font-size:
            27px;

          line-height:
            1;

          font-weight:
            900;

          letter-spacing:
            -0.05em;
        }


        .hl-explain-score small {
          color:
            #8A8177;

          font-size:
            8px;

          text-transform:
            uppercase;

          letter-spacing:
            0.08em;

          font-weight:
            800;
        }


        .hl-explain-items {
          display:
            grid;

          gap:
            6px;

          margin-top:
            14px;
        }


        .hl-explain-items div {
          padding:
            8px 10px;

          border-radius:
            9px;

          background:
            #EEF1E6;

          color:
            var(--olive-dark);

          font-size:
            8px;

          line-height:
            1.3;

          font-weight:
            800;

          transition:
            transform 200ms ease;
        }


        .hl-explain-items
          div:hover {
          transform:
            translateX(
              3px
            );
        }


        .hl-explain-items
          div.gap {
          background:
            #F3EAE2;

          color:
            #8C6956;
        }


        .hl-explain-items
          span {
          margin-right:
            5px;
        }


        /* =====================================================
           STACK
           ===================================================== */

        .hl-stack-visual {
          display:
            grid;

          align-content:
            center;

          gap:
            7px;

          padding:
            20px;
        }


        .hl-stack-layer {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            15px;

          padding:
            10px 12px;

          border:
            1px solid
            #E0D9CD;

          border-radius:
            10px;

          background:
            #FFFFFF;

          transition:
            transform 220ms ease,
            border-color 220ms ease;
        }


        .hl-stack-layer:hover {
          transform:
            translateX(
              4px
            );

          border-color:
            rgba(
              111,
              125,
              85,
              0.25
            );
        }


        .hl-stack-layer span {
          color:
            #837A70;

          font-size:
            8px;

          text-transform:
            uppercase;

          letter-spacing:
            0.07em;

          font-weight:
            800;
        }


        .hl-stack-layer strong {
          color:
            var(--espresso);

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;

          font-size:
            9px;
        }


        /* =====================================================
           TABLET
           ===================================================== */

        @media (max-width: 900px) {

          .hl-features-heading {
            grid-template-columns:
              1fr;

            gap:
              22px;
          }


          .hl-features-intro {
            margin-left:
              0;
          }


          .hl-feature-card:not(
            .featured
          ) {
            display:
              block;

            min-height:
              0;

            height:
              auto;

            padding:
              28px;
          }


          .hl-feature-card:not(
            .featured
          )
            .hl-feature-visual {
            margin-top:
              24px;

            min-height:
              180px;
          }


          .hl-feature-card.featured {
            grid-template-columns:
              1fr;

            min-height:
              auto;

            gap:
              35px;
          }

        }


        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 680px) {

          .hl-features-section {
            padding:
              110px 0;
          }


          .hl-features-shell {
            width:
              min(
                100% - 28px,
                1180px
              );
          }


          .hl-feature-grid {
            grid-template-columns:
              1fr;

            align-items:
              start;
          }


          .hl-feature-card.featured {
            grid-column:
              span 1;
          }


          .hl-feature-card {
            display:
              block;

            min-height:
              0;

            height:
              auto;

            padding:
              22px;
          }


          .hl-feature-card.featured {
            min-height:
              0;

            height:
              auto;

            padding:
              22px;
          }


          .hl-feature-title,
          .hl-feature-card:not(
            .featured
          )
            .hl-feature-title {
            font-size:
              27px;
          }


          .hl-feature-visual {
            min-height:
              175px;
          }


          .hl-vector-grid {
            grid-template-columns:
              repeat(
                12,
                minmax(
                  0,
                  1fr
                )
              );

            grid-template-rows:
              repeat(
                5,
                13px
              );

            height:
              91px;

            gap:
              4px;

            padding:
              7px 0;
          }


          .hl-vector-grid span {
            height:
              13px;

            min-height:
              13px;

            max-height:
              13px;
          }


          .hl-vector-grid
            span:nth-child(
              n+61
            ) {
            display:
              none;
          }


          .hl-embedding-bottom {
            gap:
              5px;

            margin-top:
              5px;
          }


          .hl-embedding-bottom div {
            padding:
              9px;
          }


          .hl-embedding-bottom strong {
            font-size:
              8px;
          }


          .hl-embedding-bottom span {
            font-size:
              6px;
          }


          .hl-document-visual {
            grid-template-columns:
              1fr;
          }


          .hl-document-arrow {
            transform:
              rotate(
                90deg
              );

            justify-self:
              center;
          }

        }


        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (
          prefers-reduced-motion:
            reduce
        ) {

          .hl-vector-grid span,
          .hl-document-arrow {
            animation:
              none;
          }


          .hl-feature-card {
            transition:
              none;
          }

        }

      `}</style>


      {/* =====================================================
          FEATURE CONTENT
         ===================================================== */}

      <div className="hl-features-shell">

        {/* ===================================================
            HEADER
           =================================================== */}

        <div className="hl-features-heading">

          <div>

            <div className="hl-features-kicker">

              <span className="hl-features-kicker-dot" />

              What powers HireLabs

            </div>


            <h2 className="hl-features-title">

              Built for the
              <br />

              <em>
                signal
              </em>{' '}
              behind the resume.

            </h2>

          </div>


          <p className="hl-features-intro">

            The technology stays underneath the experience.
            Candidates become structured, searchable signals,
            while recruiters get a simple interface for finding
            and evaluating people.

          </p>

        </div>


        {/* ===================================================
            FEATURE GRID
           =================================================== */}

        <div className="hl-feature-grid">

          {features.map(
            (feature) => (
              <article
                key={
                  feature.number
                }
                className={`hl-feature-card ${
                  feature.featured
                    ? 'featured'
                    : ''
                }`}
              >

                <span className="hl-feature-index">
                  {feature.number}
                </span>


                {/* =========================================
                    CONTENT
                   ========================================= */}

                <div>

                  <span className="hl-feature-number">
                    {feature.number}
                  </span>


                  <span className="hl-feature-eyebrow">
                    {feature.eyebrow}
                  </span>


                  <h3 className="hl-feature-title">
                    {feature.title}
                  </h3>


                  <p className="hl-feature-description">
                    {feature.description}
                  </p>


                  <div className="hl-feature-tags">

                    {feature.tags.map(
                      (tag) => (
                        <span
                          className="hl-feature-tag"
                          key={
                            tag
                          }
                        >
                          {tag}
                        </span>
                      )
                    )}

                  </div>

                </div>


                {/* =========================================
                    VISUAL
                   ========================================= */}

                {renderVisual(
                  feature.visual
                )}

              </article>
            )
          )}

        </div>

      </div>

    </section>
  );
}