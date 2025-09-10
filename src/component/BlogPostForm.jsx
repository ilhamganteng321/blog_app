import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../database/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const BlogPostForm = ({ post = null, onSuccess }) => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState('write'); // write, preview
  
  // State untuk form
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: '',
    featuredImage: '',
    status: 'draft'
  });

  // Jika mode edit, isi form dengan data post
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        category: post.category || '',
        tags: post.tags ? post.tags.join(', ') : '',
        featuredImage: post.featuredImage || '',
        status: post.status || 'draft'
      });
    }
  }, [post]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        toast.error('Anda harus login untuk membuat postingan');
        return;
      }

      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');

      const postData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || formData.content.substring(0, 150) + '...',
        authorId: user.uid,
        authorName: userData?.displayName || user.email,
        category: formData.category,
        tags: tagsArray,
        featuredImage: formData.featuredImage,
        status: formData.status,
        slug: generateSlug(formData.title),
        viewCount: 0,
        likes: [],
        updatedAt: serverTimestamp()
      };

      if (formData.status === 'published') {
        postData.publishedAt = serverTimestamp();
      }

      if (post) {
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, postData);
        toast.success('Postingan berhasil diperbarui!');
      } else {
        const docRef = await addDoc(collection(db, 'posts'), postData);
        toast.success('Postingan berhasil dibuat!');
      }

      if (!post) {
        setFormData({
          title: '',
          content: '',
          excerpt: '',
          category: '',
          tags: '',
          featuredImage: '',
          status: 'draft'
        });
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Terjadi kesalahan saat menyimpan postingan');
    } finally {
      setLoading(false);
    }
  };

  // Markdown components for preview
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          className="rounded-lg shadow-lg text-sm"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code
          className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-indigo-500 bg-indigo-50 p-4 my-4 italic text-sm">
          <div className="text-indigo-900">{children}</div>
        </blockquote>
      );
    },
    h1({ children }) {
      return <h1 className="text-2xl font-bold mt-6 mb-3 text-gray-900">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="text-xl font-semibold mt-5 mb-2 text-gray-900">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="text-lg font-medium mt-4 mb-2 text-gray-900">{children}</h3>;
    },
    p({ children }) {
      return <p className="mb-3 leading-relaxed text-gray-700 text-sm">{children}</p>;
    },
    ul({ children }) {
      return <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700 text-sm">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700 text-sm">{children}</ol>;
    },
  };

  // Quick formatting functions
  const insertMarkdown = (syntax, placeholder = '') => {
    const textarea = document.getElementById('content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = selectedText || placeholder;
    
    let newText = '';
    let cursorPos = start;

    switch (syntax) {
      case 'bold':
        newText = `**${replacement}**`;
        cursorPos = start + 2;
        break;
      case 'italic':
        newText = `*${replacement}*`;
        cursorPos = start + 1;
        break;
      case 'code':
        newText = `\`${replacement}\``;
        cursorPos = start + 1;
        break;
      case 'link':
        newText = `[${replacement || 'link text'}](url)`;
        cursorPos = start + (replacement ? replacement.length + 3 : 11);
        break;
      case 'image':
        newText = `![alt text](${replacement || 'image-url'})`;
        cursorPos = start + newText.length;
        break;
      case 'heading':
        newText = `## ${replacement}`;
        cursorPos = start + 3;
        break;
      case 'list':
        newText = `- ${replacement}`;
        cursorPos = start + 2;
        break;
      case 'quote':
        newText = `> ${replacement}`;
        cursorPos = start + 2;
        break;
      case 'codeblock':
        newText = `\`\`\`javascript\n${replacement}\n\`\`\``;
        cursorPos = start + 14;
        break;
    }

    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    setFormData(prev => ({ ...prev, content: newValue }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos + (replacement ? 0 : placeholder.length));
    }, 0);
  };

  const MarkdownGuide = () => (
    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Panduan Penulisan Markdown
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-gray-800">Teks Formatting:</h4>
            <div className="bg-white p-3 rounded border font-mono text-xs">
              <div>**tebal** → <strong>tebal</strong></div>
              <div>*miring* → <em>miring</em></div>
              <div>`kode` → <code className="bg-gray-100 px-1 rounded">kode</code></div>
              <div>~~coret~~ → <del>coret</del></div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800">Heading:</h4>
            <div className="bg-white p-3 rounded border font-mono text-xs">
              <div># Heading 1</div>
              <div>## Heading 2</div>
              <div>### Heading 3</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-gray-800">Lists & Links:</h4>
            <div className="bg-white p-3 rounded border font-mono text-xs">
              <div>- Item list</div>
              <div>1. Numbered list</div>
              <div>[link text](url)</div>
              <div>![alt text](image-url)</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800">Lainnya:</h4>
            <div className="bg-white p-3 rounded border font-mono text-xs">
              <div>&gt; Quote text</div>
              <div>---</div>
              <div>```javascript</div>
              <div>code block</div>
              <div>```</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
        <h2 className="text-3xl font-bold text-white flex items-center">
          <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {post ? 'Edit Postingan' : 'Buat Postingan Baru'}
        </h2>
        <p className="text-indigo-100 mt-2">Tulis artikel menarik dengan dukungan Markdown</p>
      </div>

      <div className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info Section */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Informasi Dasar
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Title */}
              <div className="lg:col-span-2">
                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                  Judul Postingan *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Masukkan judul yang menarik..."
                />
                {formData.title && (
                  <p className="text-xs text-gray-500 mt-1">
                    Slug: {generateSlug(formData.title)}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="">Pilih Kategori</option>
                  <option value="Teknologi">🔧 Teknologi</option>
                  <option value="Pemrograman">💻 Pemrograman</option>
                  <option value="Web Development">🌐 Web Development</option>
                  <option value="Tutorial">📚 Tutorial</option>
                  <option value="Desain">🎨 Desain</option>
                  <option value="Lainnya">📝 Lainnya</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="react, javascript, web development"
                />
                <p className="text-xs text-gray-500 mt-1">Pisahkan dengan koma</p>
              </div>

              {/* Featured Image */}
              <div className="lg:col-span-2">
                <label htmlFor="featuredImage" className="block text-sm font-semibold text-gray-700 mb-2">
                  Gambar Utama
                </label>
                <input
                  type="url"
                  id="featuredImage"
                  name="featuredImage"
                  value={formData.featuredImage}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.featuredImage && (
                  <div className="mt-3">
                    <img 
                      src={formData.featuredImage} 
                      alt="Preview" 
                      className="h-40 w-full object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Excerpt */}
              <div className="lg:col-span-2">
                <label htmlFor="excerpt" className="block text-sm font-semibold text-gray-700 mb-2">
                  Kutipan (Opsional)
                </label>
                <textarea
                  id="excerpt"
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Deskripsi singkat yang menarik tentang postingan ini..."
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Ringkasan yang akan muncul di halaman utama</span>
                  <span>{formData.excerpt.length}/150 karakter</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Konten Artikel
                </h3>
                
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="inline-flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {showGuide ? 'Sembunyikan Panduan' : 'Panduan Markdown'}
                  </button>
                  
                  <div className="flex bg-gray-200 rounded-md p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('write')}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                        activeTab === 'write' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      ✏️ Tulis
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                        activeTab === 'preview' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      👁️ Preview
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Formatting Toolbar */}
              {activeTab === 'write' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertMarkdown('bold', 'teks tebal')}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium transition-colors"
                    title="Bold (Ctrl+B)"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('italic', 'teks miring')}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium transition-colors italic"
                    title="Italic (Ctrl+I)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('code', 'kode')}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-mono transition-colors"
                    title="Inline Code"
                  >
                    &lt;/&gt;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('heading', 'Heading')}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold transition-colors"
                    title="Heading"
                  >
                    H
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('list', 'item')}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm transition-colors"
                    title="List"
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('link', 'text')}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm transition-colors"
                    title="Link"
                  >
                    🔗
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('image')}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm transition-colors"
                    title="Image"
                  >
                    🖼️
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('quote', 'kutipan')}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm transition-colors"
                    title="Quote"
                  >
                    💬
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('codeblock', 'console.log("Hello World!");')}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-mono transition-colors"
                    title="Code Block"
                  >
                    { }
                  </button>
                </div>
              )}
            </div>

            <div className="p-6">
              {showGuide && <MarkdownGuide />}
              
              <div className="mt-6">
                <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
                  Konten * {activeTab === 'preview' && '(Preview)'}
                </label>
                
                {activeTab === 'write' ? (
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    required
                    rows={16}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="# Judul Artikel

Mulai menulis artikel Anda di sini dengan **Markdown**...

## Subjudul

Anda bisa menggunakan:
- *teks miring*
- **teks tebal** 
- `kode inline`
- [link](https://example.com)

```javascript
// Code block
function hello() {
  console.log('Hello World!');
}
```

> Ini adalah kutipan

![alt text](image-url)

---

Selamat menulis! 🚀"
                  />
                ) : (
                  <div className="w-full min-h-[400px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 prose prose-sm max-w-none">
                    {formData.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={markdownComponents}
                      >
                        {formData.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-gray-500 italic">Tulis konten untuk melihat preview...</p>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Gunakan Markdown untuk formatting</span>
                  <span>{formData.content.length} karakter</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                  Status Publikasi
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="draft">📝 Draft</option>
                  <option value="published">🚀 Published</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    if (post && onSuccess) {
                      onSuccess();
                    } else {
                      setFormData({
                        title: '',
                        content: '',
                        excerpt: '',
                        category: '',
                        tags: '',
                        featuredImage: '',
                        status: 'draft'
                      });
                    }
                  }}
                  className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Batal
                </button>
                
                <button
                  type="submit"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                  className="bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors shadow-md"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    </span>
                  ) : (
                    '📝 Simpan sebagai Draft'
                  )}
                </button>
                
                <button
                  type="submit"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'published' }))}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg transform hover:scale-105"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Mempublikasikan...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      🚀 Publikasikan Sekarang
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Tips Section */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                💡 Tips Menulis Artikel yang Menarik
              </h4>
              <div className="text-sm text-blue-800 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>• Gunakan heading untuk struktur yang jelas</div>
                <div>• Tambahkan gambar untuk visual yang menarik</div>
                <div>• Tulis excerpt yang menggugah rasa penasaran</div>
                <div>• Gunakan list untuk poin-poin penting</div>
                <div>• Berikan contoh code yang relevan</div>
                <div>• Pilih tags yang sesuai untuk SEO</div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlogPostForm;