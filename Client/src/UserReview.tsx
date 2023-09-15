import React, { useEffect, useState } from 'react';
import axiosInstance from './AxiosInstance';
import { Link, useParams } from 'react-router-dom';
import { Review, ReviewImage } from './Entities';
import { Avatar, Box, Button, Card, CardContent, CardHeader, CircularProgress, Divider, IconButton, List, ListItem, ListItemText, Rating, TextField, Typography } from '@mui/material';
import { canDoReviewManipulations, getAvatarContent, useUserContext } from './UserContext';
import { CommentDTO } from './EntitiesDTO';
import { DeleteOutline } from '@mui/icons-material';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import signalRCommentService from './SignalRCommentService';
import signalRLikeService from './SignalRLikeService';
import signalRArtworkService from './SignalRArtworkService';

const UserReview: React.FC = () => {
  const { userId, reviewId } = useParams<{ userId: string, reviewId: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [connectedReviews, setConnectedReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { loggedInUser } = useUserContext();
  const [imageIndex, setImageIndex] = useState<number>(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [comment, setComment] = useState<CommentDTO>({
    text: '',
    reviewId: review?.id,
    userId: loggedInUser?.id
  });
  const commentHubConnection = signalRCommentService.getConnection();
  const likeHubConnection = signalRLikeService.getConnection();
  const artworkHubConnection = signalRArtworkService.getConnection();

  useEffect(() => {
    if (artworkHubConnection) {
      artworkHubConnection.on('RatedArtwork', () => {
        fetchReview();
      });
    }

    if (likeHubConnection) {
      likeHubConnection.on('LikedReview', () => {
        fetchReview();
      });
    }

    if (commentHubConnection) {
      commentHubConnection.on('ReceiveComment', () => {
        fetchReview();
      });

      commentHubConnection.on('RemoveComment', () => {
        fetchReview();
      });
    }
  }, [artworkHubConnection, likeHubConnection, commentHubConnection]);

  useEffect(() => {
    fetchReview();
    fetchConnectedReviews();
  }, [reviewId]);

  const fetchReview = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
        const response = await axiosInstance.get(`review/${userId}/${reviewId}`);
        console.log(response.data);
        setReview(response.data);
        setIsLoading(false);
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
  }

  const fetchConnectedReviews = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
        const response = await axiosInstance.get(`review/${userId}/${reviewId}/connected-reviews`);
        setConnectedReviews(response.data);
        setIsLoading(false);
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
  }

  const handleCommentInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setComment((prevFormData) => ({
      ...prevFormData,
      [name]: value
    }));
  };

  const handleLikeReview = async () => {
      await signalRLikeService.LikeReview(review?.id, loggedInUser?.id);
  };

  const images = review?.reviewImages?.map((image: ReviewImage) => ({
    original: image.imageUrl,
    thumbnail: image.imageUrl,
  })) || [];

  return (
    <Box mt={2} >
      { isLoading && <CircularProgress />}
      {review && (
        <Card>
          <CardHeader
            avatar={getAvatarContent(review.user)}
            title={review.user.userName}
            subheader={review.dateCreated}
          />
          <Divider />
          <CardContent sx={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <Typography variant="h5" sx={{color: 'black', fontWeight: 'bold'}}>
              {review.title}
            </Typography>
            <div dangerouslySetInnerHTML={{ __html: review.text }} />
            <List sx={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <ListItem>
                <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                  Mark: {review.mark}
                </Typography>
              </ListItem>
              <ListItem>
                <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                  Artwork Name: {review.artwork.name}
                </Typography>
              </ListItem>
              <ListItem>
                <Box display="flex" alignItems="center">
                  {loggedInUser?.id ? (
                    <Rating
                    name={`rating-${review.artwork.name}`}
                    value={review.artwork.rate}
                    onChange={(event, newValue) => signalRArtworkService.RateArtwork(review.artwork.id, loggedInUser.id || '', newValue)}
                    />
                  ) : (
                    <Rating
                      name={`rating-${review.artwork.name}`}
                      value={review.artwork.rate}
                      readOnly
                    />
                  )}
                  <Typography variant="h6" style={{ marginLeft: '4px' }}>
                    ({review.artwork.rate})
                  </Typography>
                </Box>
              </ListItem>
              <ListItem>
                <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                  Group: {review.group.name}
                </Typography>
              </ListItem>
              <ListItem>
                <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                  Tags: {review.tags.map((tag) => tag.text)}
                </Typography>
              </ListItem>
              </List>
              </CardContent>
              <Divider />
              <ImageList cols={3} sx={{display: 'flex', justifyContent: 'center'}}>
                {review.reviewImages?.map((image: ReviewImage, index: number) => (
                  <ImageListItem
                    key={index}
                    onClick={() => {
                      setImageIndex(index);
                      setIsGalleryOpen(true);
                    }}
                    sx={{width: '200px', ":hover": {cursor: 'pointer'}}}
                  >
                    <img
                      src={image.imageUrl}
                      alt={`${index + 1}`}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
                {loggedInUser && (
                  <ListItem>
                    <Button
                    onClick={handleLikeReview}
                    variant="contained"
                    style={{
                      backgroundColor: review.isLikedByUser ? 'red' : 'white',
                      color: review.isLikedByUser ? 'white' : 'red',
                    }}
                    >
                    {review.likes} Likes
                    </Button>
                  </ListItem>
                )}
          {connectedReviews.length > 0 && (
            <Box>
              <Divider />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Connected Reviews
                </Typography>
                <List>
                  {connectedReviews?.map((connectedReview : Review) => (
                    <ListItem key={connectedReview.id}>
                      <ListItemText>
                        <Link to={`/reviews/${connectedReview.id}`}>{connectedReview.title}</Link>
                      </ListItemText>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              <Divider />
              {review.comments?.map((comment) => (
                <Box key={comment.id} mb={1}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                          <Avatar src={comment.user.avatar} alt={comment.user.userName} />
                          <Typography variant="subtitle2" style={{ marginLeft: '8px' }}>
                            {comment.user.userName}
                          </Typography>
                        </Box>
                      </Box>
                      {canDoReviewManipulations(loggedInUser, userId) && (
                    <IconButton
                      aria-label="delete-comment"
                      color="inherit"
                      onClick={() => signalRCommentService.RemoveComment(comment.id)}
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  )}
                      <Typography variant="body1" style={{ textAlign: 'center' }}>
                        {comment.text}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              ))}
              {loggedInUser && (
                <Box mt={2} p={2} bgcolor="background.default">
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Add a Comment"
                  multiline
                  rows={4}
                  value={comment.text}
                  onChange={handleCommentInputChange}
                />
                <Box mt={2} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => signalRCommentService.LeaveComment(comment)}
                  >
                    Add Comment
                  </Button>
                </Box>
              </Box>
            )}
            </Box>
          )}
        </Card>
      )}
      {isGalleryOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
        <ImageGallery
              items={images}
              showPlayButton={false}
              showFullscreenButton={false}
              startIndex={imageIndex}
        />
        <Button onClick={() => setIsGalleryOpen(false)} 
          sx={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 1001,
          }}
        >
          Close Gallery
        </Button>
      </Box>
      )}
    </Box>
  );
};

export default UserReview;
