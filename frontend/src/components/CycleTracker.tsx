import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import './CycleTracker.css';

export default function CycleTracker() {
  const queryClient = useQueryClient();

  const { data: cycles } = useQuery({
    queryKey: ['cycles'],
    queryFn: async () => {
      const response = await apiClient.get('/cycles');
      return response.data;
    },
  });

  const createCycle = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/cycles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    },
  });

  const handleStartPeriod = () => {
    createCycle.mutate({
      startDate: new Date().toISOString(),
      flowLevel: 'medium',
    });
  };

  return (
    <div className="cycle-tracker">
      <h2 className="view-title">Cycle Tracker</h2>
      <div className="cycle-content">
        <button className="cycle-start-button" onClick={handleStartPeriod}>
          📅 Start Period
        </button>
        <div className="cycles-list">
          {cycles?.map((cycle: any) => (
            <div key={cycle.id} className="cycle-card">
              <div className="cycle-date">
                {new Date(cycle.startDate).toLocaleDateString()}
              </div>
              <div className="cycle-flow">Flow: {cycle.flowLevel || 'N/A'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

