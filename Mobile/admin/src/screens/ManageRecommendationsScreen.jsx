import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { getAllPlaces, approvePlace, rejectPlace } from '../services/adminApi';
import CustomPicker from '../components/CustomPicker';

const ManageRecommendationsScreen = ({ navigation }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await getAllPlaces();
      const places = Array.isArray(response?.data?.places) ? response.data.places : [];
      
      // Transform backend data to match frontend format
      const transformed = places.map(place => ({
        _id: place._id,
        id: place._id,
        title: place.name || 'Untitled Place',
        description: place.description || place.address || 'No description available',
        submittedBy: place.submittedBy?.name || place.submittedBy?.email || 'Unknown',
        date: place.createdAt ? new Date(place.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: place.status === 'pending' ? 'Pending' : place.status === 'approved' ? 'Approved' : 'Rejected',
        category: place.tags && place.tags.length > 0 ? place.tags[0].charAt(0).toUpperCase() + place.tags[0].slice(1) : 'Uncategorized',
        tags: place.tags || [],
        rejectionReason: place.rejectionReason || null,
      }));
      
      setRecommendations(transformed);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      Alert.alert('Error', 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const categories = ['All Categories', 'Nature', 'Food & Drink', 'Arts', 'Shopping', 'Attractions'];

  const filteredRecommendations = recommendations.filter(rec => {
    const matchesSearch = 
      !searchQuery ||
      rec.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'All Statuses' || rec.status === selectedStatus;
    const matchesCategory = selectedCategory === 'All Categories' || rec.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleStatusChange = async (id, newStatus) => {
    try {
      if (newStatus === 'Approved') {
        await approvePlace(id);
      } else if (newStatus === 'Rejected') {
        await rejectPlace(id, 'Rejected by admin');
      }
      Alert.alert('Success', `Recommendation status changed to ${newStatus}`);
      await fetchRecommendations();
    } catch (error) {
      Alert.alert('Error', 'Failed to update recommendation status');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this recommendation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectPlace(id, 'Deleted by admin');
              Alert.alert('Success', 'Recommendation deleted successfully');
              await fetchRecommendations();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete recommendation');
            }
          },
        },
      ]
    );
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Approved':
        return { color: '#10b981', bg: '#d1fae5' };
      case 'Pending':
        return { color: '#f59e0b', bg: '#fef3c7' };
      case 'Rejected':
        return { color: '#ef4444', bg: '#fee2e2' };
      default:
        return { color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const kpis = {
    pending: recommendations.filter(r => r.status === 'Pending').length,
    approvedToday: recommendations.filter(r => 
      r.status === 'Approved' && r.date === new Date().toISOString().split('T')[0]
    ).length,
    total: recommendations.length,
    last7Days: recommendations.filter(r => {
      const date = new Date(r.date);
      const today = new Date();
      const diffTime = Math.abs(today - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }).length,
  };

  if (loading && recommendations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Recommendations</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchRecommendations();
          }} tintColor="#7c3aed" />
        }
      >
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{kpis.pending}</Text>
            <Text style={styles.kpiLabel}>Pending</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{kpis.approvedToday}</Text>
            <Text style={styles.kpiLabel}>Approved Today</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{kpis.total}</Text>
            <Text style={styles.kpiLabel}>Total</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{kpis.last7Days}</Text>
            <Text style={styles.kpiLabel}>Last 7 Days</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search recommendations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Status</Text>
                <CustomPicker
                  selectedValue={selectedStatus}
                  onValueChange={setSelectedStatus}
                  items={[
                    { label: 'All Statuses', value: 'All Statuses' },
                    { label: 'Pending', value: 'Pending' },
                    { label: 'Approved', value: 'Approved' },
                    { label: 'Rejected', value: 'Rejected' },
                  ]}
                  placeholder="Select Status"
                />
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Category</Text>
                <CustomPicker
                  selectedValue={selectedCategory}
                  onValueChange={setSelectedCategory}
                  items={categories.map(cat => ({ label: cat, value: cat }))}
                  placeholder="Select Category"
                />
              </View>
            </View>
        </View>

        {/* Recommendations List */}
        <View style={styles.recommendationsList}>
          {filteredRecommendations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recommendations found</Text>
            </View>
          ) : (
            filteredRecommendations.map(rec => {
              const statusInfo = getStatusClass(rec.status);
              return (
                <View key={rec._id || rec.id} style={styles.recommendationCard}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {rec.status}
                      </Text>
                    </View>
                    {rec.category && (
                      <Text style={styles.categoryText}>{rec.category}</Text>
                    )}
                  </View>
                  <Text style={styles.cardTitle}>{rec.title}</Text>
                  <Text style={styles.cardDescription}>{rec.description}</Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>
                      By: {rec.submittedBy || 'Unknown'} • {rec.date || 'N/A'}
                    </Text>
                  </View>
                  {rec.status === 'Pending' && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleStatusChange(rec._id || rec.id, 'Approved')}
                      >
                        <Text style={styles.approveButtonText}>✓ Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleStatusChange(rec._id || rec.id, 'Rejected')}
                      >
                        <Text style={styles.rejectButtonText}>✗ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(rec._id || rec.id)}
                  >
                    <Text style={styles.deleteButtonText}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#7c3aed',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  recommendationsList: {
    padding: 15,
  },
  recommendationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardMeta: {
    marginBottom: 12,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  approveButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#10b981',
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default ManageRecommendationsScreen;

