import { DatabaseSync } from 'node:sqlite';
import { SQLITE_SCHEMA } from './schema';
import path from 'node:path';
import fs from 'node:fs';

export function seedDatabase(db: DatabaseSync) {
  // Execute schema first
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec(SQLITE_SCHEMA);

  const postColumns = db.prepare('PRAGMA table_info(posts)').all() as { name: string }[];
  if (!postColumns.some((column) => column.name === 'video_asset_id')) {
    db.exec('ALTER TABLE posts ADD COLUMN video_asset_id TEXT REFERENCES video_assets(asset_id) ON DELETE SET NULL;');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_video_asset_id ON posts(video_asset_id);');
  }

  const communityColumns = db.prepare('PRAGMA table_info(communities)').all() as { name: string }[];
  if (!communityColumns.some((column) => column.name === 'image_url')) {
    db.exec('ALTER TABLE communities ADD COLUMN image_url TEXT;');
  }

  const profileColumns = db.prepare('PRAGMA table_info(profiles)').all() as { name: string }[];
  if (!profileColumns.some((column) => column.name === 'password_hash')) {
    db.exec('ALTER TABLE profiles ADD COLUMN password_hash TEXT;');
  }

  // Check if already seeded
  const profileCountStmt = db.prepare('SELECT COUNT(*) as count FROM profiles');
  const countRow = profileCountStmt.get() as { count: number };
  if (countRow && countRow.count > 0) {
    db.exec('PRAGMA foreign_keys = ON;');
    return;
  }

  // 1. SEED PROFILES
  const insertProfile = db.prepare(`
    INSERT INTO profiles (id, username, display_name, email, avatar_url, bio, interests, subjects, languages, role, reputation_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const profiles = [
    [
      'user_sophia',
      'sophia_curator',
      'Sophia Vance',
      'sophia@curio.org',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'Founding Curator at Curio. Exploring category theory, Renaissance geometry, and cognitive architecture.',
      JSON.stringify(['Category Theory', 'Renaissance Art', 'Cognitive Science', 'Calculus']),
      JSON.stringify(['Mathematics', 'Art History']),
      JSON.stringify(['English', 'French', 'Ancient Greek']),
      'admin',
      240,
    ],
    [
      'user_gauss',
      'gauss_mind',
      'Carl Friedrich Gauss',
      'gauss@curio.org',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'Mathematics is the queen of the sciences and number theory is the queen of mathematics.',
      JSON.stringify(['Analytic Number Theory', 'Modular Arithmetic', 'Differential Geometry']),
      JSON.stringify(['Mathematics', 'Astronomy']),
      JSON.stringify(['English', 'German', 'Latin']),
      'user',
      185,
    ],
    [
      'user_hypatia',
      'hypatia_alex',
      'Hypatia of Alexandria',
      'hypatia@curio.org',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      'Reserve your right to think, for even to think wrongly is better than not to think at all.',
      JSON.stringify(['Conic Sections', 'Neoplatonism', 'Astrolabes', 'Ancient Astronomy']),
      JSON.stringify(['Philosophy', 'Mathematics']),
      JSON.stringify(['English', 'Greek']),
      'user',
      192,
    ],
    [
      'user_feynman',
      'feynman_path',
      'Richard Feynman',
      'feynman@curio.org',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      'What I cannot create, I do not understand. Curious about quantum electrodynamics, bongo drums, and simple models.',
      JSON.stringify(['Path Integrals', 'Quantum Foundations', 'Thermodynamics']),
      JSON.stringify(['Physics', 'Computer Science']),
      JSON.stringify(['English', 'Portuguese']),
      'user',
      210,
    ],
    [
      'user_ada',
      'ada_lovelace',
      'Ada Lovelace',
      'ada@curio.org',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      'The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves.',
      JSON.stringify(['Algorithms', 'Lambda Calculus', 'Symbolic Logic', 'Combinatorics']),
      JSON.stringify(['Computer Science', 'Mathematics']),
      JSON.stringify(['English']),
      'user',
      205,
    ],
    [
      'user_marcus',
      'mod_marcus',
      'Marcus Aurelius',
      'marcus@curio.org',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      'Curio Community Safety & Moderator. Dedicated to civil discourse, mutual respect, and Stoic clarity.',
      JSON.stringify(['Stoicism', 'Ethics', 'Roman History', 'Epistemology']),
      JSON.stringify(['Philosophy', 'History']),
      JSON.stringify(['English', 'Latin', 'Greek']),
      'moderator',
      160,
    ],
    [
      'user_maya',
      'maya_curious',
      'Maya Lin',
      'maya@curio.org',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      'Lifelong student. Currently working through Spivak Calculus and exploring early modern epistemology.',
      JSON.stringify(['Calculus', 'Epistemology', 'Classical Mechanics']),
      JSON.stringify(['Mathematics', 'Philosophy']),
      JSON.stringify(['English', 'Mandarin']),
      'user',
      35,
    ],
  ];

  for (const p of profiles) {
    insertProfile.run(...p);
  }

  // 2. SEED USER BADGES
  const insertBadge = db.prepare(`
    INSERT INTO user_badges (id, user_id, badge_key, title, category, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const badges = [
    ['badge_1', 'user_sophia', 'curator_founder', 'Platform Curator', 'Editorial', 'Curates foundational open knowledge collections on Curio.'],
    ['badge_2', 'user_gauss', 'proof_artisan', 'Proof Artisan', 'Mathematics', 'Authored 10+ rigorously peer-reviewed mathematical explanations.'],
    ['badge_3', 'user_hypatia', 'philosophic_clarity', 'Philosophic Clarity', 'Philosophy', 'Demonstrated exceptional insight in foundational epistemological debates.'],
    ['badge_4', 'user_feynman', 'great_explainer', 'Master Explainer', 'Pedagogy', 'Explains deep physical principles without unnecessary jargon.'],
    ['badge_5', 'user_ada', 'algorithmic_architect', 'Algorithmic Architect', 'Computer Science', 'Pioneered elegant computational breakdowns in Ideas Lab.'],
    ['badge_6', 'user_marcus', 'sentinel_civility', 'Guardian of Civility', 'Safety', 'Maintains respectful, welcoming discourse across all communities.'],
  ];

  for (const b of badges) {
    insertBadge.run(...b);
  }

  // 3. SEED TOPICS
  const insertTopic = db.prepare(`
    INSERT INTO topics (id, name, slug, description, category, icon, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const topics = [
    ['top_number_theory', 'Number Theory', 'number-theory', 'Primes, modular arithmetic, Diophantine equations, and the zeta function.', 'Mathematics', 'Binary', '#8B5CF6'],
    ['top_topology', 'Topology', 'topology', 'Surfaces, manifolds, Euler characteristics, and topological invariants.', 'Mathematics', 'Shapes', '#EC4899'],
    ['top_quantum', 'Quantum Mechanics', 'quantum-mechanics', 'Wavefunctions, Hilbert spaces, entanglement, and measurement.', 'Science & Tech', 'Atom', '#0EA5E9'],
    ['top_algorithms', 'Algorithms & Complexity', 'algorithms-complexity', 'P vs NP, Turing completeness, algorithmic graph theory, and automata.', 'Science & Tech', 'Cpu', '#10B981'],
    ['top_epistemology', 'Epistemology', 'epistemology', 'The nature, limits, and justification of human knowledge and belief.', 'Humanities & Arts', 'Lightbulb', '#F59E0B'],
    ['top_classical_art', 'Art & Geometry', 'art-geometry', 'Perspective, golden ratio, chiaroscuro, and architectural proportions.', 'Humanities & Arts', 'Palette', '#FF6B6B'],
  ];

  for (const t of topics) {
    insertTopic.run(...t);
  }

  // 4. SEED COMMUNITIES
  const insertCommunity = db.prepare(`
    INSERT INTO communities (id, name, slug, description, rules, category, icon, color, creator_id, is_private, member_count, post_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const communities = [
    [
      'c_math',
      'Mathematics',
      'mathematics',
      'A welcoming haven for lovers of proofs, conjectures, and mathematical elegance. From epsilon-delta to category theory.',
      '1. Be intellectually generous. 2. Show derivations and working steps. 3. Use KaTeX notation for formulas. 4. No homework dumping without earnest initial attempts.',
      'Mathematics',
      'Pi',
      '#8B5CF6',
      'user_gauss',
      0,
      1420,
      38,
    ],
    [
      'c_physics',
      'Physics',
      'physics',
      'Investigating the structure of reality from Planck scales to the cosmic web. Experiments, field theories, and thought experiments.',
      '1. Respect empirical evidence and theoretical coherence. 2. Distinguish peer consensus from speculative hypotheses. 3. Cite primary sources where possible.',
      'Science and technology',
      'Atom',
      '#0EA5E9',
      'user_feynman',
      0,
      980,
      27,
    ],
    [
      'c_cs',
      'Computer Science',
      'computer-science',
      'The science of computation: automata, formal languages, algorithms, type systems, and distributed consensus.',
      '1. Keep code clean and properly attributed. 2. Discuss principles alongside implementations. 3. Zero AI-generated code spam.',
      'Science and technology',
      'Terminal',
      '#10B981',
      'user_ada',
      0,
      1150,
      31,
    ],
    [
      'c_phil',
      'Philosophy',
      'philosophy',
      'Deep inquiry into truth, consciousness, ethics, logic, and the good life across global traditions.',
      '1. Charitable interpretation: construct the strongest version of arguments. 2. No ad hominem or partisan political derailment. 3. Ground discussions in philosophical literature.',
      'Humanities and arts',
      'BookOpen',
      '#F59E0B',
      'user_hypatia',
      0,
      890,
      24,
    ],
    [
      'c_art_history',
      'Art & History',
      'art-and-history',
      'Exploring historical epochs, primary texts, visual culture, architectural revolutions, and archaeological discoveries.',
      '1. Verify historical claims against reputable historiography. 2. Credit original artwork and photographers. 3. Share historical context generously.',
      'Humanities and arts',
      'Scroll',
      '#FF6B6B',
      'user_sophia',
      0,
      640,
      19,
    ],
  ];

  for (const c of communities) {
    insertCommunity.run(...c);
  }

  // Memberships
  const insertMembership = db.prepare(`
    INSERT INTO community_memberships (id, community_id, user_id, role)
    VALUES (?, ?, ?, ?)
  `);

  const memberships = [
    ['mem_1', 'c_math', 'user_gauss', 'admin'],
    ['mem_2', 'c_math', 'user_sophia', 'member'],
    ['mem_3', 'c_math', 'user_maya', 'member'],
    ['mem_4', 'c_physics', 'user_feynman', 'admin'],
    ['mem_5', 'c_physics', 'user_maya', 'member'],
    ['mem_6', 'c_cs', 'user_ada', 'admin'],
    ['mem_7', 'c_cs', 'user_sophia', 'member'],
    ['mem_8', 'c_phil', 'user_hypatia', 'admin'],
    ['mem_9', 'c_phil', 'user_marcus', 'moderator'],
    ['mem_10', 'c_art_history', 'user_sophia', 'admin'],
  ];

  for (const m of memberships) {
    insertMembership.run(...m);
  }

  // 5. SEED LICENSES
  const insertLicense = db.prepare(`
    INSERT INTO resource_licenses (id, code, name, url, can_redistribute, attribution_required, commercial_allowed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const licenses = [
    ['lic_pd', 'Public Domain', 'Public Domain / CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/', 1, 0, 1],
    ['lic_cc_by', 'CC BY 4.0', 'Creative Commons Attribution 4.0 International', 'https://creativecommons.org/licenses/by/4.0/', 1, 1, 1],
    ['lic_cc_by_sa', 'CC BY-SA 4.0', 'Creative Commons Attribution-ShareAlike 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 1, 1, 1],
    ['lic_mit', 'MIT License', 'MIT Open Courseware & Software License', 'https://opensource.org/licenses/MIT', 1, 1, 1],
    ['lic_arxiv', 'arXiv Open Access', 'arXiv Non-exclusive Distribution License', 'https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html', 1, 1, 0],
    ['lic_gfdl', 'GNU FDL', 'GNU Free Documentation License 1.3', 'https://www.gnu.org/licenses/fdl-1.3.html', 1, 1, 1],
  ];

  for (const l of licenses) {
    insertLicense.run(...l);
  }

  // 6. SEED LIBRARY RESOURCES
  const insertResource = db.prepare(`
    INSERT INTO resources (id, title, author, description, subject, subtopic, difficulty_level, publication_year, source_url, license_id, permission_status, uploader_id, version, download_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const resources = [
    [
      'res_euclid',
      'Euclid’s Elements (Books I–VI, Oliver Byrne Color Edition)',
      'Euclid of Alexandria (Ed. Oliver Byrne)',
      'The foundational treatise on plane geometry rendered with brilliant primary-colored diagrams replacing letter labels for direct visual proof clarity.',
      'Mathematics',
      'Geometry',
      'Beginner',
      1847,
      'https://www.c82.net/euclid/',
      'lic_pd',
      'verified',
      'user_sophia',
      '1.0',
      842,
    ],
    [
      'res_einstein',
      'Relativity: The Special and General Theory',
      'Albert Einstein',
      'Einstein’s own popular exposition written for readers who are interested in the theory from a general scientific and philosophical point of view.',
      'Physics',
      'Relativity',
      'Intermediate',
      1916,
      'https://www.gutenberg.org/ebooks/5001',
      'lic_pd',
      'verified',
      'user_feynman',
      '1.0',
      620,
    ],
    [
      'res_turing',
      'On Computable Numbers, with an Application to the Entscheidungsproblem',
      'Alan M. Turing',
      'The seminal 1936 paper introducing universal Turing machines, computable sequences, and the uncomputability of the Halting problem.',
      'Computer Science',
      'Theory of Computation',
      'Advanced',
      1936,
      'https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf',
      'lic_pd',
      'verified',
      'user_ada',
      '1.0',
      915,
    ],
    [
      'res_sicp',
      'Structure and Interpretation of Computer Programs (SICP)',
      'Harold Abelson and Gerald Jay Sussman with Julie Sussman',
      'The classic MIT text on computer systems, abstraction, functional programming, metacircular evaluation, and interpreter design.',
      'Computer Science',
      'Programming Paradigms',
      'Intermediate',
      1996,
      'https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.xhtml',
      'lic_cc_by_sa',
      'verified',
      'user_ada',
      '2.0',
      1280,
    ],
    [
      'res_spivak_guide',
      'Companion Notes to Spivak’s Calculus: Proof Techniques and Axioms',
      'Curio Mathematics Guild',
      'Community-authored open guide breaking down the rigorous transition from computational calculus to epsilon-delta analysis and Cauchy sequences.',
      'Mathematics',
      'Real Analysis',
      'Intermediate',
      2024,
      'https://github.com/curio-community/spivak-companion',
      'lic_cc_by',
      'verified',
      'user_gauss',
      '1.2',
      430,
    ],
    [
      'res_meditations',
      'Meditations (Hays Translation Reference Edition)',
      'Marcus Aurelius',
      'Personal spiritual and ethical writings of the Roman Emperor, reflecting on nature, duty, mortality, and inner tranquility.',
      'Philosophy',
      'Stoicism',
      'Beginner',
      180,
      'https://standardebooks.org/ebooks/marcus-aurelius/meditations',
      'lic_pd',
      'verified',
      'user_marcus',
      '1.0',
      780,
    ],
  ];

  for (const r of resources) {
    insertResource.run(...r);
  }

  // 7. SEED LECTURES (Lecture Atlas)
  const insertLecture = db.prepare(`
    INSERT INTO lectures (id, title, instructor, institution, subject, subtopic, difficulty_level, language, duration_mins, prerequisites, original_url, embed_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const lectures = [
    [
      'lec_3b1b_linear',
      'Essence of Linear Algebra: Vectors, Linear Combinations & Spans',
      'Grant Sanderson',
      '3Blue1Brown',
      'Mathematics',
      'Linear Algebra',
      'Beginner',
      'English',
      16,
      'Basic high school algebra and Cartesian coordinates.',
      'https://www.youtube.com/watch?v=fNk_zzaMoSs',
      'https://www.youtube-nocookie.com/embed/fNk_zzaMoSs',
      'published',
    ],
    [
      'lec_feynman_law',
      'The Character of Physical Law: The Law of Gravitation',
      'Richard Feynman',
      'Cornell University (Messenger Lectures)',
      'Physics',
      'Classical & Quantum Gravitation',
      'Intermediate',
      'English',
      55,
      'High school physics intuition.',
      'https://www.youtube.com/watch?v=j3mhkYbznBk',
      'https://www.youtube-nocookie.com/embed/j3mhkYbznBk',
      'published',
    ],
    [
      'lec_mit_strang',
      'MIT 18.06: The Geometry of Linear Equations',
      'Prof. Gilbert Strang',
      'MIT OpenCourseWare',
      'Mathematics',
      'Linear Algebra',
      'Beginner',
      'English',
      40,
      'Algebra fundamentals.',
      'https://www.youtube.com/watch?v=J7DzL2_Na80',
      'https://www.youtube-nocookie.com/embed/J7DzL2_Na80',
      'published',
    ],
    [
      'lec_susskind_mechanics',
      'The Theoretical Minimum: Classical Mechanics Lecture 1',
      'Prof. Leonard Susskind',
      'Stanford University',
      'Physics',
      'Theoretical Physics',
      'Intermediate',
      'English',
      105,
      'Single-variable calculus and vectors.',
      'https://www.youtube.com/watch?v=pyX8kQ-JzHI',
      'https://www.youtube-nocookie.com/embed/pyX8kQ-JzHI',
      'published',
    ],
    [
      'lec_sandel_justice',
      'Justice: What’s The Right Thing To Do? (The Moral Side of Murder)',
      'Prof. Michael Sandel',
      'Harvard University',
      'Philosophy',
      'Ethics',
      'Beginner',
      'English',
      54,
      'None. Open to all inquiring minds.',
      'https://www.youtube.com/watch?v=kBdfcR-8hEY',
      'https://www.youtube-nocookie.com/embed/kBdfcR-8hEY',
      'published',
    ],
  ];

  for (const lec of lectures) {
    insertLecture.run(...lec);
  }

  // 8. SEED STUDY CIRCLES
  const insertCircle = db.prepare(`
    INSERT INTO circles (id, name, slug, description, subject, is_private, creator_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const circles = [
    [
      'circ_spivak',
      'Spivak Calculus Reading Circle',
      'spivak-calculus',
      'A chapter-by-chapter collaborative journey through Michael Spivak’s Calculus. We work through challenging problems and post alternative proof strategies.',
      'Mathematics',
      0,
      'user_maya',
      'active',
    ],
    [
      'circ_geb',
      'Gödel, Escher, Bach: Strange Loops Study Circle',
      'geb-strange-loops',
      'Reading Douglas Hofstadter’s masterpiece. Unpacking self-referential systems, Bach fugues, Gödelian incompleteness, and consciousness.',
      'Humanities and arts',
      0,
      'user_ada',
      'active',
    ],
    [
      'circ_quantum_foundations',
      'Quantum Foundations & Entanglement Seminar',
      'quantum-foundations',
      'Private research group examining Bell’s inequalities, GHZ states, decoherence time scales, and relational interpretations of quantum mechanics.',
      'Science and technology',
      1,
      'user_feynman',
      'active',
    ],
  ];

  for (const cir of circles) {
    insertCircle.run(...cir);
  }

  // Circle members
  const insertCircleMember = db.prepare(`
    INSERT INTO circle_members (id, circle_id, user_id, role)
    VALUES (?, ?, ?, ?)
  `);

  insertCircleMember.run('cm_1', 'circ_spivak', 'user_maya', 'organizer');
  insertCircleMember.run('cm_2', 'circ_spivak', 'user_gauss', 'member');
  insertCircleMember.run('cm_3', 'circ_spivak', 'user_sophia', 'member');
  insertCircleMember.run('cm_4', 'circ_geb', 'user_ada', 'organizer');
  insertCircleMember.run('cm_5', 'circ_geb', 'user_hypatia', 'member');
  insertCircleMember.run('cm_6', 'circ_quantum_foundations', 'user_feynman', 'organizer');
  insertCircleMember.run('cm_7', 'circ_quantum_foundations', 'user_sophia', 'member');

  // Circle Milestones
  const insertMilestone = db.prepare(`
    INSERT INTO circle_milestones (id, circle_id, title, description, target_date, is_completed)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertMilestone.run('ms_1', 'circ_spivak', 'Chapters 1-3: Numbers of Various Sorts', 'Axioms of fields, inequalities, and absolute values.', '2026-11-01', 1);
  insertMilestone.run('ms_2', 'circ_spivak', 'Chapters 4-6: Functions & Limits', 'Rigorous epsilon-delta definitions and the Squeeze Theorem.', '2026-11-15', 0);
  insertMilestone.run('ms_3', 'circ_spivak', 'Chapters 7-9: Continuity & The Intermediate Value Theorem', 'Least upper bound property and Bolzano-Weierstrass.', '2026-12-01', 0);
  insertMilestone.run('ms_4', 'circ_geb', 'Introduction & Three-Part Invention', 'Achilles and the Tortoise dialogue analysis.', '2026-11-10', 1);
  insertMilestone.run('ms_5', 'circ_geb', 'The MIU Formal System & Decision Procedures', 'Theorem proving inside vs outside a formal system.', '2026-11-24', 0);

  // Circle discussions
  const insertCircleDisc = db.prepare(`
    INSERT INTO circle_discussions (id, circle_id, author_id, title, content)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertCircleDisc.run(
    'cd_1',
    'circ_spivak',
    'user_maya',
    'Question regarding Chapter 1 Problem 4(c) triangle inequality proof',
    'When proving $|a - b| \\ge ||a| - |b||$, is it cleaner to expand $|a| = |(a - b) + b|$ or should we square both sides first? Would love feedback on the most transparent line of reasoning!'
  );
  insertCircleDisc.run(
    'cd_2',
    'circ_spivak',
    'user_gauss',
    'Re: Problem 4(c) — The additive substitution method',
    'Writing $|a| = |(a - b) + b| \\le |a - b| + |b|$ gives $|a| - |b| \\le |a - b|$ directly without extraneous sign ambiguity from squaring. Applying the symmetric argument with $a$ and $b$ swapped immediately yields $-|a - b| \\le |a| - |b|$, which synthesizes the desired inequality.'
  );

  // 9. SEED IDEAS LAB (Investigations)
  const insertInvestigation = db.prepare(`
    INSERT INTO investigations (id, title, slug, subject, summary, status, creator_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const investigations = [
    [
      'idea_collatz',
      'Dynamical Systems and Invariant Measure Obstructions on the 3x+1 Graph',
      'collatz-dynamical-measures',
      'Mathematics',
      'Investigating whether the standard Collatz Syracuse map $T(n)$ can be modeled as a continuous ergodic transformation on the 2-adic integers $\\mathbb{Z}_2$, and whether invariant Haar measure entropy bounds preclude divergent orbits.',
      'exploring',
      'user_gauss',
    ],
    [
      'idea_p_np',
      'Geometric Complexity Theory: Orbit Closures and Kronecker Coefficients',
      'geometric-complexity-p-vs-np',
      'Science and technology',
      'Analyzing Mulmuley and Sohoni’s program to separate VP from VNP via representation theory. Specifically exploring how occurrence obstructions differ from multiplicity obstructions in determinant vs permanent varieties.',
      'under_discussion',
      'user_ada',
    ],
    [
      'idea_consciousness',
      'Epistemic Closure and Higher-Order Representational Models of Subjectivity',
      'epistemic-closure-consciousness',
      'Humanities and arts',
      'Investigating whether intentional states require recursive metacognitive representations, or whether phenomenal content is intrinsically non-propositional and non-relational.',
      'seeking_collaborators',
      'user_hypatia',
    ],
  ];

  for (const inv of investigations) {
    insertInvestigation.run(...inv);
  }

  // Investigation revisions
  const insertRevision = db.prepare(`
    INSERT INTO investigation_revisions (id, investigation_id, author_id, version_num, hypothesis, proposed_arguments, citations, change_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRevision.run(
    'rev_collatz_1',
    'idea_collatz',
    'user_gauss',
    1,
    'The Syracuse map extended to 2-adic integers admits no non-trivial compact invariant sets possessing positive metric entropy.',
    'Let $T: \\mathbb{Z}_2 \\to \\mathbb{Z}_2$ be defined by $T(x) = x/2$ if $x \\equiv 0 \\pmod 2$, and $(3x+1)/2$ if $x \\equiv 1 \\pmod 2$. If a divergent trajectory exists over the natural numbers, its closure in the projective limit must concentrate measure on non-periodic branches.',
    '1. Lagarias, J. C. (1985). The 3x + 1 problem and its generalizations. Amer. Math. Monthly.\n2. Tao, T. (2019). Almost all orbits of the Collatz map attain almost bounded values.',
    'Initial formulation of the 2-adic measure framing and literature reference baseline.'
  );

  insertRevision.run(
    'rev_collatz_2',
    'idea_collatz',
    'user_gauss',
    2,
    'Refined hypothesis: The logarithmic distortion factor $\\log_2(3)$ ensures topological transitivity on the Cantor set of odd residues.',
    'By examining the ergodic averages $\\frac{1}{N} \\sum_{k=0}^{N-1} \\log_2 \\frac{T(x_{k+1})}{x_k}$, the drift coefficient is strictly negative: $\\frac{1}{2}\\log_2(1/2) + \\frac{1}{2}\\log_2(3/2) = \\frac{1}{2}\\log_2(3/4) \\approx -0.2075 < 0$. This downward drift enforces almost-sure descent to small values.',
    '3. Bernstein, D. J. (1994). A non-probabilistic run-time analysis of the Syracuse algorithm.',
    'Added logarithmic drift coefficient calculation and rigorous step-down bounds.'
  );

  // 10. SEED POSTS (Explore Social Feed)
  const insertPost = db.prepare(`
    INSERT INTO posts (id, title, content, post_type, community_id, author_id, flair, math_notation, image_url, sticker_code, is_pinned, reaction_count, comment_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const posts = [
    [
      'post_euler',
      'The Geometric Elegance of Euler’s Formula: Why $e^{i\\pi} + 1 = 0$',
      `Why does the exponential of an imaginary number rotate in the complex plane rather than grow exponentially?

Consider the differential equation defining the exponential function:
$$\\frac{d}{dt} z(t) = i z(t)$$
with initial condition $z(0) = 1$.

In vector terms, multiplying any complex number $z = x + iy$ by $i$ rotates it counterclockwise by $90^\\circ$ because:
$$i(x + iy) = -y + ix$$
which is orthogonal to the original vector: $\\langle x, y \\rangle \\cdot \\langle -y, x \\rangle = -xy + yx = 0$.

Therefore, the velocity vector $\\frac{dz}{dt}$ is always strictly perpendicular to the position vector $z(t)$ at every instant, with a magnitude equal to $|z(t)|$. A particle whose acceleration is always purely perpendicular to its position with constant unit speed traces out the unit circle!

Integrating from $t = 0$ to $t = \\pi$ carries the point around exactly a half-circle from $1$ to $-1$:
$$e^{i\\pi} = -1 \\implies e^{i\\pi} + 1 = 0$$

No mysterious magic—just uniform circular motion in the complex plane!`,
      'discovery',
      'c_math',
      'user_gauss',
      'Proof & Intuition',
      1,
      null,
      'eureka',
      1,
      48,
      12,
    ],
    [
      'post_bell',
      'Bell’s Theorem: Why Local Realism Cannot Explain the Quantum World',
      `In 1964, John Stewart Bell asked an apparently simple question: Could the statistical correlations predicted by quantum mechanics be explained by hidden parameters pre-determined at particle creation?

Let’s inspect the Clauser-Horne-Shimony-Holt (CHSH) inequality. Under local realism (where measurement outcomes depend only on local hidden variable $\\lambda$ and speed-of-light constraints):
$$|E(a, b) - E(a, b') + E(a', b) + E(a', b')| \\le 2$$

Yet, for an entangled singlet state $\\frac{1}{\\sqrt{2}}(|01\\rangle - |10\\rangle)$, when Alice and Bob choose measurement angles separated by $22.5^\\circ$, quantum mechanics predicts:
$$E(a, b) = -\\cos(\\theta_a - \\theta_b)$$
Evaluating the CHSH expression at optimal angles yields:
$$|-\\frac{\\sqrt{2}}{2} - (+\\frac{\\sqrt{2}}{2}) + \\frac{\\sqrt{2}}{2} + \\frac{\\sqrt{2}}{2}| = 2\\sqrt{2} \\approx 2.828 > 2$$

Nature has been tested repeatedly in loophole-free experiments (Aspect 1982, Hensen 2015), and the quantum violation holds decisively. Either the universe is non-local, or realism (definite observer-independent values prior to measurement) must be abandoned!`,
      'research_update',
      'c_physics',
      'user_feynman',
      'Quantum Foundations',
      1,
      null,
      'lightbulb',
      0,
      39,
      8,
    ],
    [
      'post_poll_qm',
      'Curio Community Poll: Foundational Interpretations of Quantum Mechanics',
      `Which interpretation of quantum mechanics do you find most physically satisfying and mathematically coherent?

Please share your reasoning in the comments below! We are looking for genuine physical arguments regarding wavefunction collapse vs unitary evolution, rather than dogmatic dismissals.`,
      'poll',
      'c_physics',
      'user_sophia',
      'Community Poll',
      0,
      null,
      null,
      0,
      52,
      19,
    ],
    [
      'post_halting',
      'Diagonalization and Turing’s Halting Problem in 4 Steps',
      `Alan Turing’s 1936 proof of the unsolvability of the Halting problem is one of the most stunning applications of Cantor’s diagonal argument.

Here is the exact structure:
1. **Hypothesis**: Suppose there exists a program $H(M, w)$ that always halts and returns $1$ if machine $M$ halts on input $w$, and $0$ if $M$ loops forever.
2. **Construction**: Construct a new machine $D$ that takes program text $\\langle M \\rangle$ as input:
   - Call $H(M, \\langle M \\rangle)$ as a subroutine.
   - If $H$ returns $1$ (meaning $M$ halts on itself), $D$ enters an infinite loop: \`while(true) {}\`.
   - If $H$ returns $0$ (meaning $M$ loops on itself), $D$ terminates immediately: \`return true\`.
3. **The Diagonal Question**: What happens when we run $D$ with its own description as input: $D(\\langle D \\rangle)$?
   - If $D(\\langle D \\rangle)$ halts, then by definition of $D$, $H(D, \\langle D \\rangle) = 1$, which caused $D$ to loop infinitely. Contradiction!
   - If $D(\\langle D \\rangle)$ loops infinitely, then $H(D, \\langle D \\rangle) = 0$, which caused $D$ to halt immediately. Contradiction!
4. **Conclusion**: Such a decider $H$ cannot exist in mathematics or physics. Computation has intrinsic boundaries!`,
      'text',
      'c_cs',
      'user_ada',
      'Theoretical CS',
      1,
      null,
      'insightful',
      0,
      34,
      6,
    ],
    [
      'post_allegory',
      'Plato’s Allegory of the Cave: The Cognitive Ascent to Form',
      `In Book VII of the *Republic*, Socrates describes prisoners chained in an underground dwelling since childhood, facing a blank wall upon which shadows of artifacts are cast by a fire behind them.

The crucial epistemic transition occurs not when the prisoner is unbound, but when they are dragged up the steep and rugged ascent into the sunlight. The physical pain of optical adaptation mirrors the cognitive distress of shedding deeply held illusions.

Three reflections for our modern information age:
- The shadows are not inherently false representations—they are projected realities conditioned by a particular vantage point.
- Education is not *putting sight into blind eyes*, but turning the whole soul toward what is luminous.
- The philosopher who returns to the cave is initially clumsy in the dark, reminding us that humility is essential when translating high theory into everyday human life.`,
      'text',
      'c_phil',
      'user_hypatia',
      'Classical Philosophy',
      0,
      null,
      'curious',
      0,
      27,
      5,
    ],
    [
      'post_meme_parts',
      'When Integration by Parts actually terminates on the first iteration without cyclic recurrence',
      `We’ve all had those differential calculus nightmares where $u = e^x$ and $dv = \\sin(x)dx$ turns into an infinite algebraic carousel.

Finding an integrand that vanishes cleanly at the first boundary substitution feels like finding a rare mineral in the bedrock of analysis!`,
      'meme',
      'c_math',
      'user_maya',
      'Math Humor',
      0,
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
      'celebrate',
      0,
      61,
      14,
    ],
  ];

  for (const post of posts) {
    insertPost.run(...post);
  }

  // Poll details for post_poll_qm
  const insertPoll = db.prepare(`
    INSERT INTO polls (id, post_id, question, ends_at)
    VALUES (?, ?, ?, ?)
  `);
  insertPoll.run('poll_qm', 'post_poll_qm', 'Which interpretation of quantum mechanics do you find most mathematically coherent?', '2026-12-31');

  const insertOption = db.prepare(`
    INSERT INTO poll_options (id, poll_id, text, vote_count)
    VALUES (?, ?, ?, ?)
  `);

  insertOption.run('opt_everett', 'poll_qm', 'Many-Worlds / Everettian Unitary Evolution (Pure Schrödinger equation)', 34);
  insertOption.run('opt_copenhagen', 'poll_qm', 'Copenhagen / Operationalist (Wavefunction as epistemic tool)', 18);
  insertOption.run('opt_bohm', 'poll_qm', 'de Broglie–Bohm Pilot Wave (Deterministic non-local trajectories)', 12);
  insertOption.run('opt_relational', 'poll_qm', 'Relational QM / QBism (Observer-relative state assignments)', 9);

  // Poll votes
  const insertVote = db.prepare(`
    INSERT INTO poll_votes (id, poll_id, option_id, user_id)
    VALUES (?, ?, ?, ?)
  `);
  insertVote.run('pv_1', 'poll_qm', 'opt_everett', 'user_gauss');
  insertVote.run('pv_2', 'poll_qm', 'opt_everett', 'user_ada');
  insertVote.run('pv_3', 'poll_qm', 'opt_copenhagen', 'user_hypatia');

  // 11. SEED COMMENTS
  const insertComment = db.prepare(`
    INSERT INTO comments (id, post_id, author_id, parent_id, content, is_helpful, reaction_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertComment.run(
    'comm_euler_1',
    'post_euler',
    'user_ada',
    null,
    'This geometric viewpoint using $\\frac{dz}{dt} = i z$ is vastly superior to the standard Taylor series substitution ($1 - \\frac{x^2}{2!} + \\dots$) taught in first-year calculus! With Taylor series, the identity feels like a coincidental algebraic match; with the rotational velocity vector, its necessity is obvious.',
    1,
    14
  );

  insertComment.run(
    'comm_euler_2',
    'post_euler',
    'user_maya',
    'comm_euler_1',
    'As someone currently struggling through calculus, this mental picture finally made the connection between the imaginary unit $i$ and 2D rotations click. Thank you so much for this explanation!',
    0,
    6
  );

  insertComment.run(
    'comm_bell_1',
    'post_bell',
    'user_gauss',
    null,
    'The remarkable thing about Bell’s formulation is that it converted what Einstein, Podolsky, and Rosen treated as an unresolvable philosophical debate into a concrete experimental test with an empirical inequality.',
    1,
    11
  );

  // 12. SEED REACTIONS
  const insertReaction = db.prepare(`
    INSERT INTO reactions (id, post_id, comment_id, user_id, reaction_type)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertReaction.run('react_1', 'post_euler', null, 'user_sophia', 'eureka');
  insertReaction.run('react_2', 'post_euler', null, 'user_feynman', 'insightful');
  insertReaction.run('react_3', 'post_euler', null, 'user_ada', 'heart');
  insertReaction.run('react_4', 'post_bell', null, 'user_sophia', 'lightbulb');
  insertReaction.run('react_5', 'post_halting', null, 'user_gauss', 'eureka');

  // 13. SEED SOCIAL FOLLOWS
  const insertFollow = db.prepare(`
    INSERT INTO follows (id, follower_id, following_id)
    VALUES (?, ?, ?)
  `);

  insertFollow.run('fol_1', 'user_maya', 'user_gauss');
  insertFollow.run('fol_2', 'user_maya', 'user_feynman');
  insertFollow.run('fol_3', 'user_sophia', 'user_gauss');
  insertFollow.run('fol_4', 'user_sophia', 'user_ada');
  insertFollow.run('fol_5', 'user_gauss', 'user_ada');

  // 14. SEED NOTIFICATIONS
  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, sender_id, type, message, link, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run(
    'notif_1',
    'user_sophia',
    'user_gauss',
    'reply',
    'gauss_mind mentioned Euler’s identity in the Mathematics community.',
    '/c/mathematics',
    0
  );
  insertNotification.run(
    'notif_2',
    'user_sophia',
    'user_maya',
    'circle_invite',
    'maya_curious invited you to join the Spivak Calculus Reading Circle.',
    '/circles/spivak-calculus',
    0
  );

  // 15. SEED NOTIFICATION PREFERENCES
  const insertPref = db.prepare(`
    INSERT INTO notification_preferences (user_id, email_notifications, in_app_replies, in_app_mentions, in_app_invites, in_app_reactions)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const p of profiles) {
    insertPref.run(p[0], 0, 1, 1, 1, 1);
  }

  // 16. SEED SAMPLE MODERATION REPORT (for testing the moderator queue)
  const insertReport = db.prepare(`
    INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertReport.run(
    'rep_demo_1',
    'user_maya',
    'post',
    'post_meme_parts',
    'other',
    'Check flair: this post might belong under Humor flair rather than Math Discussion.',
    'pending'
  );

  db.exec('PRAGMA foreign_keys = ON;');
}
