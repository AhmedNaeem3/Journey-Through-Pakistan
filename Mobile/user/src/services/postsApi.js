import api from './api';

export const listPosts = (params = {}) =>
  api.get('/posts', { params });

export const getPost = (postId) =>
  api.get(`/posts/${postId}`);

export const createPost = (formData) =>
  api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updatePost = (postId, data) =>
  api.put(`/posts/${postId}`, data);

export const deletePost = (postId) =>
  api.delete(`/posts/${postId}`);

export const toggleLike = (postId) =>
  api.post(`/posts/${postId}/like`);

export const addComment = (postId, text, parentCommentId = null) =>
  api.post(`/posts/${postId}/comment`, { text, parentCommentId });

export const sharePost = (postId) =>
  api.post(`/posts/${postId}/share`);

export const toggleSavePost = (postId) =>
  api.post(`/posts/${postId}/save`);

export const getSavedPosts = () =>
  api.get('/posts/saved');

export const listPostsByAuthor = (authorId) =>
  api.get('/posts', { params: { author: authorId } });

export const trendingHashtags = () =>
  api.get('/posts/trending-hashtags');

