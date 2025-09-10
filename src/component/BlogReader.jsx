import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { db } from '../database/firebase';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

const BlogReader = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [viewCountUpdated, setViewCountUpdated] = useState(false);
  const [fontSize, setFontSize] = useState('medium');

  // Font size options
  const fontSizeOptions = {
    small: 'text-base',
    medium: 'text-lg',
    large: 'text-xl'
  };

  // Fungsi untuk memformat tanggal
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Tanggal tidak tersedia';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Tanggal tidak valid';
    }
  };

  // Fungsi untuk estimasi waktu baca
  const calculateReadTime = (content) => {
    if (!content) return '5 min read';
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);

        if (postDoc.exists()) {
          const postData = postDoc.data();
          setPost({
            id: postDoc.id,
            ...postData,
            formattedDate: formatDate(postData.publishedAt),
            readTime: calculateReadTime(postData.content)
          });

          // Cek jika user sudah like post ini
          if (user && postData.likes && postData.likes.includes(user.uid)) {
            setIsLiked(true);
          }
        } else {
          setError('Postingan tidak ditemukan');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Gagal memuat postingan');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId, user]);

  // Update view count (hanya sekali per session)
  useEffect(() => {
    const updateViewCount = async () => {
      if (post && !viewCountUpdated) {
        try {
          const postRef = doc(db, 'posts', post.id);
          await updateDoc(postRef, {
            viewCount: (post.viewCount || 0) + 1
          });
          setViewCountUpdated(true);
        } catch (error) {
          console.error('Error updating view count:', error);
        }
      }
    };

    if (post && post.status === 'published') {
      updateViewCount();
    }
  }, [post, viewCountUpdated]);

  // Handle like/unlike
  const handleLike = async () => {
    if (!user) {
      toast.info('Anda harus login untuk menyukai postingan');
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      
      if (isLiked) {
        // Unlike
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
        setIsLiked(false);
        setPost(prev => ({
          ...prev,
          likes: prev.likes.filter(id => id !== user.uid)
        }));
        toast.success('Berhasil batal menyukai');
      } else {
        // Like
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });
        setIsLiked(true);
        setPost(prev => ({
          ...prev,
          likes: [...(prev.likes || []), user.uid]
        }));
        toast.success('Berhasil menyukai');
      }
    } catch (error) {
      console.error('Error updating like:', error);
      toast.error('Gagal memperbarui like');
    }
  };

  // Custom components for ReactMarkdown
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          className="rounded-lg shadow-lg"
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
        <blockquote className="border-l-4 border-indigo-500 bg-indigo-50 p-4 my-6 italic">
          <div className="text-indigo-900">{children}</div>
        </blockquote>
      );
    },
    h1({ children }) {
      return <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="text-xl font-medium mt-4 mb-2 text-gray-900">{children}</h3>;
    },
    p({ children }) {
      return <p className="mb-4 leading-relaxed text-gray-700">{children}</p>;
    },
    ul({ children }) {
      return <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700">{children}</ol>;
    },
    li({ children }) {
      return <li className="ml-4">{children}</li>;
    },
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 underline transition-colors"
        >
          {children}
        </a>
      );
    },
    img({ src, alt }) {
      return (
        <div className="my-6">
          <img
            src={src}
            alt={alt}
            className="w-full rounded-lg shadow-lg"
            loading="lazy"
          />
          {alt && (
            <p className="text-sm text-gray-500 text-center mt-2 italic">{alt}</p>
          )}
        </div>
      );
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-6">
          <table className="min-w-full bg-white border border-gray-300 rounded-lg">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-gray-50">{children}</thead>;
    },
    th({ children }) {
      return (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200">
          {children}
        </td>
      );
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat artikel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            to="/" 
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Postingan tidak ditemukan</h1>
          <Link 
            to="/" 
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10 border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors group"
            >
              <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Kembali ke Beranda
            </Link>
            
            {/* Font Size Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Ukuran font:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {Object.entries(fontSizeOptions).map(([size, _]) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      fontSize === size 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {size === 'small' ? 'A' : size === 'medium' ? 'A' : 'A'}
                    {size === 'large' && <span className="text-lg">+</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center text-sm text-gray-500 mb-6 flex-wrap gap-4">
            <span className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wide">
              {post.category || 'Uncategorized'}
            </span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {post.formattedDate}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {post.readTime}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {post.viewCount || 0} views
              </span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">{post.title}</h1>
          
          <div className="flex items-center justify-center">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">
                  {(post.authorName || 'Unknown Author').split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </div>
            <div className="ml-4 text-left">
              <p className="text-lg font-semibold text-gray-900">
                {post.authorName || 'Unknown Author'}
              </p>
              <p className="text-sm text-gray-500">Penulis</p>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="mb-12 -mx-4 sm:mx-0">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <img 
                src={post.featuredImage} 
                alt={post.title}
                className="w-full h-64 md:h-96 lg:h-[32rem] object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`prose prose-lg max-w-none mb-12 ${fontSizeOptions[fontSize]}`}>
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-lg border border-gray-200/50">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={markdownComponents}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
            <div className="flex flex-wrap gap-3">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-medium hover:from-indigo-200 hover:to-purple-200 transition-colors cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Like Section */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-3 px-6 py-3 rounded-full font-medium transition-all transform hover:scale-105 ${
                  isLiked 
                    ? 'text-white bg-gradient-to-r from-red-500 to-pink-500 shadow-lg' 
                    : 'text-gray-700 bg-white hover:bg-red-50 hover:text-red-600 shadow-md border border-gray-200'
                }`}
              >
                <svg 
                  className="w-6 h-6" 
                  fill={isLiked ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>
                  {isLiked ? 'Disukai' : 'Suka'} ({post.likes ? post.likes.length : 0})
                </span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-gray-200/50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Artikel Terkait</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
              <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Fitur artikel terkait akan segera hadir</p>
              <p className="text-sm text-gray-500 mt-2">Kami sedang mengembangkan rekomendasi artikel yang personal untuk Anda</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogReader;