/**
 * HireLabs Platform Interactive Application Logic
 * Powered by Gemini Embeddings (1536 dimensions) & pgvector Semantic Matching
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSandboxTabs();
  initResumeParserDemo();
  initSemanticMatchDemo();
  initBillingToggle();
  initFaqAccordion();
  initModal();
});

/* ==========================================================================
   1. Navbar & Scroll Interactions
   ========================================================================== */
function initNavbar() {
  const header = document.querySelector('.navbar-header');
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.getElementById('navMenu');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const isOpen = navMenu.classList.contains('open');
      mobileToggle.innerHTML = isOpen 
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    });

    // Close menu when clicking nav links
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }
}

/* ==========================================================================
   2. Interactive Sandbox Tabs
   ========================================================================== */
function initSandboxTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.sandbox-tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach(content => {
        if (content.id === `${targetTab}-tab`) {
          content.style.display = 'block';
        } else {
          content.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   3. AI Resume Parser Sandbox Data & Simulator
   ========================================================================== */
const sampleResumes = {
  alex: {
    name: "Alex Mercer",
    role: "Lead Full-Stack AI Engineer",
    experienceYears: 8,
    location: "San Francisco, CA (Remote)",
    rawSnippet: "Senior engineer with 8+ years building enterprise SaaS. Specialized in Next.js App Router, Supabase Postgres, pgvector, TypeScript, and integrating Gemini 1.5 Pro & Embedding models for real-time document semantic retrieval. Led team of 6 engineers to scale vector search from 10k to 5M docs with p99 < 85ms.",
    parsedData: {
      candidate_profile: {
        full_name: "Alex Mercer",
        title: "Lead Full-Stack AI Engineer",
        years_experience: 8,
        contact: {
          email: "alex.mercer@hirelabs-demo.io",
          github: "github.com/alexmercer-ai"
        }
      },
      skills_normalized: {
        frontend: ["Next.js 15 (App Router)", "React", "TypeScript", "Tailwind CSS"],
        backend_database: ["Supabase", "PostgreSQL", "pgvector", "Node.js", "Redis"],
        ai_ml: ["Gemini Embeddings (1536-dim)", "LLM Fine-tuning", "RAG Pipelines", "Prompt Engineering"],
        cloud_devops: ["Docker", "Vercel", "Supabase Auth & Storage RLS", "GitHub Actions"]
      },
      work_history: [
        {
          company: "Cortex AI Systems",
          title: "Lead AI Solutions Architect",
          duration: "2022 - Present",
          highlights: "Scaled pgvector document indexing across 5M resumes with Supabase RLS isolation."
        },
        {
          company: "Nexus Labs",
          title: "Senior Full-Stack Engineer",
          duration: "2019 - 2022",
          highlights: "Architected real-time candidate search APIs with Next.js & GraphQL."
        }
      ],
      vector_embedding: {
        model: "models/gemini-embedding-002",
        dimensions: 1536,
        sample_vector: [-0.02341, 0.08412, -0.05193, 0.01248, 0.09112, -0.04781, "... [1530 more dimensions]"]
      }
    }
  },
  sarah: {
    name: "Dr. Sarah Lin",
    role: "Staff ML & Vector Systems Engineer",
    experienceYears: 10,
    location: "Seattle, WA",
    rawSnippet: "Ph.D. in Computer Science with focus on High-Dimensional Nearest Neighbors search and LLMs. Deep expertise in pgvector HNSW indexing, Gemini embedding representations, quantization, PyTorch, Python backend services, and multi-tenant security architectures.",
    parsedData: {
      candidate_profile: {
        full_name: "Dr. Sarah Lin",
        title: "Staff ML & Vector Systems Engineer",
        years_experience: 10,
        contact: {
          email: "sarah.lin@vectorfoundry.org",
          github: "github.com/drsarahlin"
        }
      },
      skills_normalized: {
        frontend: ["Python Streamlit", "React Basics"],
        backend_database: ["PostgreSQL", "pgvector (HNSW / IVFFlat)", "C++", "Python (FastAPI)", "gRPC"],
        ai_ml: ["High-Dim Embeddings", "Gemini 1.5 Pro", "Vector Quantization", "PyTorch", "LangChain"],
        cloud_devops: ["AWS SageMaker", "Kubernetes", "Supabase Cloud", "Docker"]
      },
      work_history: [
        {
          company: "VectorScale Labs",
          title: "Staff Research Engineer",
          duration: "2021 - Present",
          highlights: "Benchmarked 1536-dim embedding recall rates and optimized cosine similarity queries."
        }
      ],
      vector_embedding: {
        model: "models/gemini-embedding-002",
        dimensions: 1536,
        sample_vector: [0.07129, -0.01423, 0.09341, -0.03819, 0.06551, 0.01209, "... [1530 more dimensions]"]
      }
    }
  },
  elena: {
    name: "Elena Rostova",
    role: "Principal Cloud & Data Architect",
    experienceYears: 12,
    location: "New York, NY",
    rawSnippet: "Enterprise Cloud Architect specializing in SOC2 compliance, PostgreSQL partitioning, Row Level Security (RLS) enforcement, and resilient Next.js microservices. Extensive experience orchestrating private resume parsing storage buckets with zero data leaks.",
    parsedData: {
      candidate_profile: {
        full_name: "Elena Rostova",
        title: "Principal Cloud & Data Architect",
        years_experience: 12,
        contact: {
          email: "e.rostova@cloudscale.net",
          github: "github.com/erostova"
        }
      },
      skills_normalized: {
        frontend: ["Next.js", "TypeScript"],
        backend_database: ["PostgreSQL RLS", "Supabase Storage Policies", "pgvector", "Go", "Terraform"],
        ai_ml: ["Data Ingestion Pipelines", "LLM Security Guardrails", "Embedding Storage Architecture"],
        cloud_devops: ["AWS / GCP", "Supabase Enterprise", "CI/CD Hardening", "Vault"]
      },
      work_history: [
        {
          company: "GovTech Secure",
          title: "Principal Security Architect",
          duration: "2020 - Present",
          highlights: "Configured multi-tenant Postgres RLS policies preventing cross-team vector leakage."
        }
      ],
      vector_embedding: {
        model: "models/gemini-embedding-002",
        dimensions: 1536,
        sample_vector: [-0.01824, 0.04519, -0.08124, 0.05219, 0.01183, -0.06412, "... [1530 more dimensions]"]
      }
    }
  }
};

function initResumeParserDemo() {
  const chips = document.querySelectorAll('.sample-chip[data-resume]');
  const dropzone = document.getElementById('parserDropzone');
  const codeOutput = document.getElementById('parserJsonOutput');
  const parsingStatus = document.getElementById('parsingStatusText');
  const vectorBadge = document.getElementById('vectorDimsBadge');

  function renderParserResult(key) {
    const data = sampleResumes[key];
    if (!data) return;

    if (parsingStatus) parsingStatus.innerHTML = `<span class="badge badge-amber"><span class="live-pulse"></span> Extracting text & tokenizing...</span>`;

    setTimeout(() => {
      if (parsingStatus) parsingStatus.innerHTML = `<span class="badge badge-purple"><span class="live-pulse"></span> Normalizing with Gemini 1.5 Pro...</span>`;
    }, 400);

    setTimeout(() => {
      if (parsingStatus) parsingStatus.innerHTML = `<span class="badge badge-emerald"><span class="live-pulse"></span> 1536-dim Vector Indexed in pgvector</span>`;
      if (vectorBadge) vectorBadge.textContent = "1536 Dimensions (Gemini-002)";

      if (codeOutput) {
        codeOutput.innerHTML = formatJsonHighlight(data.parsedData);
      }
    }, 850);
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderParserResult(chip.dataset.resume);
    });
  });

  if (dropzone) {
    dropzone.addEventListener('click', () => {
      // Simulate file upload
      const keys = ['alex', 'sarah', 'elena'];
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      chips.forEach(c => {
        c.classList.toggle('active', c.dataset.resume === randomKey);
      });
      renderParserResult(randomKey);
    });
  }

  // Initial render
  renderParserResult('alex');
}

function formatJsonHighlight(jsonObj) {
  const str = JSON.stringify(jsonObj, null, 2);
  return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'json-num';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-bool';
    } else if (/null/.test(match)) {
      cls = 'json-bool';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

/* ==========================================================================
   4. Semantic Match Engine Sandbox Simulator
   ========================================================================== */
const sampleJobSpecs = {
  ai_engineer: {
    title: "Senior Full Stack AI Engineer (Next.js + pgvector)",
    description: "Looking for an engineer experienced in Next.js App Router, Supabase Auth/Storage, pgvector semantic search, and Gemini embeddings (1536-dim). Must have strong TypeScript and PostgreSQL background.",
    matches: [
      {
        name: "Alex Mercer",
        role: "Lead Full-Stack AI Engineer",
        score: 97.4,
        isTop: true,
        reasoning: "Exceptional semantic match. Deep direct experience with Next.js App Router, Supabase RLS, and 1536-dim Gemini embeddings vector indexing. Built real-time ATS search handling millions of embeddings.",
        evidence: ["Next.js App Router", "pgvector 1536-dim", "Supabase Auth/Storage RLS", "TypeScript"],
        gaps: ["No explicit Python FastAPI (not required by JD)"]
      },
      {
        name: "Dr. Sarah Lin",
        role: "Staff ML & Vector Systems Engineer",
        score: 88.2,
        isTop: false,
        reasoning: "High vector match on AI/ML and pgvector internals. Strong algorithms background, but primary focus is backend Python and HNSW indexing rather than frontend Next.js App Router.",
        evidence: ["pgvector HNSW", "Gemini Embeddings", "PostgreSQL"],
        gaps: ["Less production React/Next.js frontend experience"]
      },
      {
        name: "Elena Rostova",
        role: "Principal Cloud & Data Architect",
        score: 83.7,
        isTop: false,
        reasoning: "Solid match on PostgreSQL, Supabase RLS security, and Next.js architecture. More oriented toward cloud compliance and data infrastructure than core full-stack application logic.",
        evidence: ["PostgreSQL RLS", "Supabase Storage", "Next.js"],
        gaps: ["Lacks direct embedding fine-tuning experience"]
      }
    ]
  },
  vector_researcher: {
    title: "Staff Vector & Embeddings Systems Specialist",
    description: "Seeking deep vector search and high-dimensional nearest neighbors expert. Experience with HNSW indexing, pgvector tuning, embedding model benchmarking, and PyTorch.",
    matches: [
      {
        name: "Dr. Sarah Lin",
        role: "Staff ML & Vector Systems Engineer",
        score: 98.9,
        isTop: true,
        reasoning: "Near-perfect domain match. Ph.D. in High-Dimensional nearest neighbors, benchmarked 1536-dim Gemini embeddings, expert in HNSW indexing and quantization.",
        evidence: ["High-Dim Vector Theory", "HNSW & IVFFlat pgvector", "PyTorch", "Gemini Embeddings"],
        gaps: ["None identified"]
      },
      {
        name: "Alex Mercer",
        role: "Lead Full-Stack AI Engineer",
        score: 82.5,
        isTop: false,
        reasoning: "Good applied vector search experience with pgvector, but primarily focused on product application layer rather than low-level index algorithms.",
        evidence: ["Applied pgvector", "Gemini Embeddings"],
        gaps: ["No deep PyTorch or C++ vector kernel background"]
      },
      {
        name: "Elena Rostova",
        role: "Principal Cloud & Data Architect",
        score: 79.1,
        isTop: false,
        reasoning: "Strong database and storage background, capable of scaling vector databases, but lacks research-grade ML modeling experience.",
        evidence: ["Postgres Partitioning", "Storage scaling"],
        gaps: ["Limited PyTorch/ML research depth"]
      }
    ]
  }
};

function initSemanticMatchDemo() {
  const jobButtons = document.querySelectorAll('.job-preset-btn');
  const resultsContainer = document.getElementById('semanticMatchResults');
  const jdInput = document.getElementById('jobDescriptionInput');
  const calculateBtn = document.getElementById('runSemanticMatchBtn');

  function renderMatchResults(jobKey) {
    const job = sampleJobSpecs[jobKey] || sampleJobSpecs['ai_engineer'];
    if (jdInput) jdInput.value = job.description;

    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--accent-cyan);">
        <div class="badge-pulse" style="margin-bottom: 0.5rem;"><span class="dot"></span> Computing 1536-dim Cosine Distance with pgvector...</div>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Executing <code style="color: var(--accent-cyan);">&lt;=&gt;</code> Cosine Distance RPC with Supabase RLS filter...</p>
      </div>
    `;

    setTimeout(() => {
      let html = '<div class="candidate-rank-list">';
      
      job.matches.forEach((cand, idx) => {
        const topClass = cand.isTop ? 'top-match' : '';
        const scoreBadgeClass = cand.score >= 90 ? 'score-high' : 'score-mid';

        html += `
          <div class="rank-item-card ${topClass}">
            <div class="rank-header">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="rank-num">#${idx + 1}</div>
                <div>
                  <div style="font-weight: 700; color: #fff; font-size: 1rem;">${cand.name}</div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">${cand.role}</div>
                </div>
              </div>
              <div class="badge-score ${scoreBadgeClass}">
                ${cand.score}% Match
              </div>
            </div>

            <div class="reasoning-box">
              <div style="margin-bottom: 0.5rem; color: var(--text-primary);">
                <strong>AI Match Analysis:</strong> ${cand.reasoning}
              </div>
              
              <div style="margin-top: 0.5rem;">
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Evidence: </span>
                ${cand.evidence.map(e => `<span class="evidence-tag">✓ ${e}</span>`).join(' ')}
              </div>

              ${cand.gaps.length ? `
                <div style="margin-top: 0.35rem;">
                  <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Flagged Gaps: </span>
                  ${cand.gaps.map(g => `<span class="gap-tag">⚠ ${g}</span>`).join(' ')}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });

      html += '</div>';
      resultsContainer.innerHTML = html;
    }, 600);
  }

  jobButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      jobButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMatchResults(btn.dataset.job);
    });
  });

  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      renderMatchResults('ai_engineer');
    });
  }

  // Initial render
  renderMatchResults('ai_engineer');
}

/* ==========================================================================
   5. Billing Period Toggle (Monthly / Annual)
   ========================================================================== */
function initBillingToggle() {
  const toggle = document.getElementById('billingToggle');
  const priceStarter = document.getElementById('priceStarter');
  const priceGrowth = document.getElementById('priceGrowth');
  const priceEnterprise = document.getElementById('priceEnterprise');

  if (!toggle) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    const isAnnual = toggle.classList.contains('active');

    if (isAnnual) {
      if (priceStarter) priceStarter.textContent = '$39';
      if (priceGrowth) priceGrowth.textContent = '$119';
      if (priceEnterprise) priceEnterprise.textContent = '$299';
    } else {
      if (priceStarter) priceStarter.textContent = '$49';
      if (priceGrowth) priceGrowth.textContent = '$149';
      if (priceEnterprise) priceEnterprise.textContent = '$379';
    }
  });
}

/* ==========================================================================
   6. FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        
        // Close all items
        faqItems.forEach(i => i.classList.remove('open'));

        // Toggle clicked
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });
}

/* ==========================================================================
   7. Candidate Inspection Modal
   ========================================================================== */
function initModal() {
  const modalOverlay = document.getElementById('demoModal');
  const closeBtns = document.querySelectorAll('.modal-close-btn');
  const triggerBtns = document.querySelectorAll('.open-demo-modal');

  triggerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modalOverlay) modalOverlay.classList.add('active');
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (modalOverlay) modalOverlay.classList.remove('active');
    });
  });

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  }
}
